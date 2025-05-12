import { Injectable, NotFoundException } from "@nestjs/common";
import { FileStreamerService } from "src/file-streamer/file-streamer.service";
import { GoogleDriveService } from "../google-drive/google-drive.service";
import { UploadedFilesDto } from "./dto/uploaded-files.dto";
import { FilesRepository } from "./files.repository";
import { FileDto } from "./dto/file.dto";
import { GoogleDriveError } from "src/google-drive/google-drive.error";

interface GoogleFileMetadata {
  mimeType: string;
  fileSize: number;
  uploadId: string;
  webContentLink: string;
  webViewLink: string;
}

@Injectable()
export class FilesService {
  private readonly MAX_ATTEMPTS = 3
  private readonly CHUNK_SIZE = 256 * 1024; // 256KB

  constructor(
    private filesRepository: FilesRepository,
    private googleDriveService: GoogleDriveService,
    private fileStreamerService: FileStreamerService,
  ) {}

  public async getAllFiles(): Promise<FileDto[]> {
    return this.filesRepository.findAll();
  }

  public async deleteFile(originalUrl: string): Promise<void> {
    const file = await this.filesRepository.findByOriginalUrl(originalUrl);
    if (file) {
      await this.googleDriveService.deleteFile(file.googleDriveId);
      await this.filesRepository.delete(file.id);
    } else {
      throw new NotFoundException(`File with URL ${originalUrl} not found`);
    }
  }

  public async uploadFiles(urls: string[]): Promise<UploadedFilesDto> {
    const results: UploadedFilesDto = {};
  
    for (const url of urls) {
      results[url] = await this.uploadFileWithRetries(url);
    }
  
    return results;
  }
  
  private async uploadFileWithRetries(url: string): Promise<FileDto | string> {
    let attempts = 0;
  
    while (attempts < this.MAX_ATTEMPTS) {
      try {
        return await this.attemptFileUpload(url);
      } catch (error) {
        if (++attempts >= this.MAX_ATTEMPTS) {
          return `Failed to upload: Maximum attempts (${this.MAX_ATTEMPTS}) reached`;
        }
  
        if (error instanceof GoogleDriveError) {
          continue;
        }
  
        return `Failed to upload: ${error.message}`;
      }
    }
  }

  private async attemptFileUpload(url: string): Promise<FileDto> {
    const { uploadUri } = await this.googleDriveService.initiateResumableUpload();

    const { mimeType, fileSize, uploadId, webContentLink, webViewLink } =
      await this.uploadToGoogleDisk(url, uploadUri);

    return await this.filesRepository.create({
      originalUrl: url,
      googleDriveId: uploadId,
      googleDriveViewUrl: webViewLink,
      googleDriveDownloadUrl: webContentLink,
      mimeType,
      size: fileSize,
    });
  }

  private async uploadToGoogleDisk(url: string, uploadUri: string): Promise<GoogleFileMetadata> {
    let buffer = Buffer.alloc(0);
    let offset = 0;

    return await new Promise<GoogleFileMetadata>(async (resolve, reject) => {
      try {
        const { stream, mimeType, fileSize } = await this.fileStreamerService.getReadableData(url);
  
        stream.on("data", async (subChunk: Buffer) => {
          stream.pause();
          buffer = Buffer.concat([buffer, subChunk]);
  
          if (buffer.length >= this.CHUNK_SIZE) {
            try {
              const { newRange } = await this.googleDriveService.uploadChunk({
                uploadUri,
                mimeType,
                offset,
                chunk: buffer,
                totalSize: fileSize,
              });
  
              buffer = buffer.subarray(newRange.end - offset + 1);
              offset = newRange.end + 1;
            } catch (uploadError) {
              reject(uploadError);
              stream.destroy();
              return;
            }
          }
  
          stream.resume();
        });
  
        stream.on("end", async () => {
          if (buffer.length > 0) {
            try {
              const response = await this.googleDriveService.uploadChunk({
                uploadUri,
                mimeType,
                offset,
                totalSize: fileSize,
                chunk: buffer,
              });
  
              await this.googleDriveService.shareFile(response.uploadId);
  
              const fileMetadata = await this.googleDriveService.getFileMetadata(response.uploadId);
  
              buffer = Buffer.alloc(0);
  
              resolve({
                mimeType,
                fileSize,
                uploadId: fileMetadata.id,
                webContentLink: fileMetadata.webContentLink,
                webViewLink: fileMetadata.webViewLink,
              });
            } catch (uploadError) {
              reject(uploadError);
              stream.destroy();
              return;
            }
          }
        });
  
        stream.on("error", reject);

      } catch (error) {
        reject(error)
      }
    });
  }
}
