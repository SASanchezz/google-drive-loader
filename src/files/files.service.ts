import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { FileStreamerService } from "src/file-streamer/file-streamer.service";
import { GoogleDriveService } from "../google-drive/google-drive.service";
import { UploadedFilesDto } from "./dto/uploaded-files.dto";
import { FilesRepository } from "./files.repository";
import { FileDto } from "./dto/file.dto";

interface GoogleFileMetadata {
  mimeType: string;
  fileSize: number;
  uploadId: string;
  webContentLink: string;
  webViewLink: string;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
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
      try {
        const result = await this.processFileUpload(url);
        results[url] = result;
      } catch (error) {
        results[url] = "Failed to upload: " + error.message;
      }
    }

    return results;
  }

  private async processFileUpload(url: string): Promise<FileDto> {
    const { uploadUri } = await this.googleDriveService.initiateResumableUpload();

    const { mimeType, fileSize, uploadId, webContentLink, webViewLink } =
      await this.downloadAndUploadFile(url, uploadUri);

    return await this.filesRepository.create({
      originalUrl: url,
      googleDriveId: uploadId,
      googleDriveViewUrl: webViewLink,
      googleDriveDownloadUrl: webContentLink,
      mimeType,
      size: fileSize,
    });
  }

  private async downloadAndUploadFile(url: string, uploadUri: string): Promise<GoogleFileMetadata> {
    let buffer = Buffer.alloc(0);
    let offset = 0;

    return await new Promise<GoogleFileMetadata>(async (resolve, reject) => {
      try {
        const {
          stream: response,
          mimeType,
          fileSize,
        } = await this.fileStreamerService.getReadableData(url);
  
        response.on("data", async (subChunk: Buffer) => {
          response.pause();
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
            }
          }
  
          response.resume();
        });
  
        response.on("end", async () => {
          if (buffer.length > 0) {
            try {
              const res = await this.googleDriveService.uploadChunk({
                uploadUri,
                mimeType,
                offset,
                totalSize: fileSize,
                chunk: buffer,
              });
  
              await this.googleDriveService.shareFile(res.uploadId);
  
              const fileMetadata = await this.googleDriveService.getFileMetadata(res.uploadId);
  
              buffer = Buffer.alloc(0); // Reset buffer after upload
  
              resolve({
                mimeType,
                fileSize,
                uploadId: fileMetadata.id,
                webContentLink: fileMetadata.webContentLink,
                webViewLink: fileMetadata.webViewLink,
              });
            } catch (uploadError) {
              reject(uploadError);
            }
          }
        });
  
        response.on("error", reject);

      } catch (error) {
        reject(error)
      }
    });
  }
}
