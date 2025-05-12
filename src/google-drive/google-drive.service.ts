import { Injectable } from '@nestjs/common';
import { drive_v3, google } from 'googleapis';
import * as path from 'path';

interface UploadFileParams {
  uploadUri: string;
  chunk: Buffer;
  mimeType: string;
  offset: number;
  totalSize: number;
}

interface UploadFileResponse {
  uploadId?: string;
  newRange?: {
    start: number;
    end: number;
  }
}


@Injectable()
export class GoogleDriveService {
  private readonly AUTH_KEY_FILE = path.join(__dirname, '../../service-account-key.json');
  private readonly AUTH_SCOPES = ['https://www.googleapis.com/auth/drive'];
  private readonly RESUMABLE_UPLOAD_TYPE = 'resumable';
  private readonly UPLOAD_URI = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
  
  private readonly drive: drive_v3.Drive;

  constructor() {
    const oauth2Client = new google.auth.GoogleAuth({
      keyFile: this.AUTH_KEY_FILE,
      scopes: this.AUTH_SCOPES,
    });

    this.drive = google.drive({
      version: 'v3',
      auth: oauth2Client,
    });
  }

  public async initiateResumableUpload(): Promise<{ uploadUri: string }> {
    const response = await this.drive.files.create({
      uploadType: this.RESUMABLE_UPLOAD_TYPE,
    }, {
      url: this.UPLOAD_URI,
      method: "POST"
    });
    
    return { uploadUri: response.headers.location };
  }

  public async uploadChunk(params: UploadFileParams): Promise<UploadFileResponse> {
    const { uploadUri, chunk, mimeType, offset, totalSize } = params;
    const chunkLength = chunk.byteLength;

    try {
      const response = await this.drive.files.create({}, {
        method: 'PUT',
        url: uploadUri,
        headers: {
          'Content-Length': chunkLength,
          'Content-Range': this.getContentRange(offset, chunkLength, totalSize),
          'Content-Type': mimeType,
        },
        body: chunk,
      });

      return Promise.resolve({ uploadId: response.data.id });

    } catch (error) {
      if (error.response && error.response.status === 308) {
        const range: string = error.response.headers['range'];

        return Promise.resolve({ newRange: this.parseRange(range) });
      } else {
        throw error;
      }
    }
  }

  public async getFileMetadata(fileId: string): Promise<drive_v3.Schema$File> {
    return this.drive.files.get({
      fileId,
      fields: 'id, mimeType, size, webContentLink, webViewLink',
    }).then(response => response.data);
  }

  public async shareFile(fileId: string): Promise<void> {
    await this.drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  }

  private getContentRange(offset: number, chunkLength: number, totalSize: number): string {
    return `bytes ${offset}-${offset + chunkLength - 1}/${totalSize}`
  }

  private parseRange(range: string): { start: number; end: number } {
    const parts = range.replace('bytes=', '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parseInt(parts[1], 10);
    return { start, end };
  }
}
