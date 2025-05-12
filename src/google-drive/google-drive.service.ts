import { Injectable } from "@nestjs/common";
import { drive_v3, google } from "googleapis";
import * as path from "path";
import { GoogleDriveError } from "./google-drive.error";

interface UploadFileParams {
  uploadUri: string;
  chunk: Buffer;
  mimeType: string;
  offset: number;
  totalSize: number;
}

interface UploadFileResponse {
  uploadId?: string;
  shouldRetry?: boolean;
  newRange?: {
    start: number;
    end: number;
  };
}

@Injectable()
export class GoogleDriveService {
  private readonly AUTH_KEY_FILE = path.join(__dirname, "../../service-account-key.json");
  private readonly AUTH_SCOPES = ["https://www.googleapis.com/auth/drive"];
  private readonly RESUMABLE_UPLOAD_TYPE = "resumable";
  private readonly UPLOAD_URI =
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable";

  private readonly drive: drive_v3.Drive;

  constructor() {
    const oauth2Client = new google.auth.GoogleAuth({
      keyFile: this.AUTH_KEY_FILE,
      scopes: this.AUTH_SCOPES,
    });

    this.drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });
  }

  public async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({
        fileId,
      });
    } catch (error) {
      console.error(`Error deleting file with ID ${fileId}:`, error);
      throw error;
    }
  }

  public async initiateResumableUpload(): Promise<{ uploadUri: string }> {
    const response = await this.drive.files.create(
      {
        uploadType: this.RESUMABLE_UPLOAD_TYPE,
      },
      {
        url: this.UPLOAD_URI,
        method: "POST",
      },
    );

    return { uploadUri: response.headers.location };
  }

  public async uploadChunk(params: UploadFileParams): Promise<UploadFileResponse> {
    while (true) {
      try {
        return await this.executeChunkUpload(params);
      } catch (error) {
        const response = this.handleUploadError(error);
        if (response.newRange) {
          return response;
        }

        if (!response.shouldRetry) {
          throw error;
        }
      }
    }
  }

  public async getFileMetadata(fileId: string): Promise<drive_v3.Schema$File> {
    return this.drive.files
      .get({
        fileId,
        fields: "id, mimeType, size, webContentLink, webViewLink",
      })
      .then(response => response.data);
  }

  public async shareFile(fileId: string): Promise<void> {
    await this.drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
  }
  
  private async executeChunkUpload(params: UploadFileParams): Promise<UploadFileResponse> {
    const { uploadUri, chunk, mimeType, offset, totalSize } = params;
    const chunkLength = chunk.byteLength;

    const response = await this.drive.files.create(
      {},
      {
        method: "PUT",
        url: uploadUri,
        headers: {
          "Content-Length": chunkLength,
          "Content-Range": this.getContentRange(offset, chunkLength, totalSize),
          "Content-Type": mimeType,
        },
        body: chunk,
      },
    );
  
    return { uploadId: response.data.id };
  }
  
  private handleUploadError(error: any): UploadFileResponse {
    if (!error.response) {
      throw error;
    }
  
    const { status, headers } = error.response;
  
    if (status === 308) {
      const range = headers["range"];
      return { newRange: this.parseRange(range) };
    }
  
    if (status === 404) {
      throw new GoogleDriveError("Upload session has expired and the upload must be restarted from the beginning");
    }
  
    if (status >= 500) {
      return { shouldRetry: true };
    }
  
    return { shouldRetry: false };
  }

  private getContentRange(offset: number, chunkLength: number, totalSize: number): string {
    return `bytes ${offset}-${offset + chunkLength - 1}/${totalSize}`;
  }

  private parseRange(range: string): { start: number; end: number } {
    const parts = range.replace("bytes=", "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parseInt(parts[1], 10);
    return { start, end };
  }
}
