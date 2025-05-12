import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { FilesRepository } from "./files.repository";
import { GoogleDriveService } from "../google-drive/google-drive.service";
import { FileDto } from "./dto/file.dto";
import { FileStreamerService } from "src/file-streamer/file-streamer.service";

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

  async getAllFiles(): Promise<FileDto[]> {
    return this.filesRepository.findAll();
  }

  async deleteFile(originalUrl: string): Promise<void> {
    const file = await this.filesRepository.findByOriginalUrl(originalUrl);
    if (file) {
      await this.googleDriveService.deleteFile(file.googleDriveId);
      await this.filesRepository.delete(file.id);
    } else {
      throw new NotFoundException(`File with URL ${originalUrl} not found`);
    }
  }

  async uploadFiles(urls: string[]): Promise<FileDto[]> {
    const results: FileDto[] = [];

    for (const url of urls) {
      try {
        const result = await this.processFileUpload(url);
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to upload file from URL: ${url}`,
          error.stack,
        );
      }
    }

    return results;
  }

  private async processFileUpload(url: string): Promise<FileDto> {
    const { uploadUri } =
      await this.googleDriveService.initiateResumableUpload();

    const { mimeType, fileSize, uploadId, webContentLink, webViewLink } =
      await this.downloadAndUploadFile(url, uploadUri);

    const file = await this.filesRepository.create({
      originalUrl: url,
      googleDriveId: uploadId,
      googleDriveViewUrl: webViewLink,
      googleDriveDownloadUrl: webContentLink,
      mimeType,
      size: fileSize,
    });

    return {
      id: file.id,
      originalUrl: file.originalUrl,
      googleDriveId: file.googleDriveId,
      googleDriveViewUrl: file.googleDriveViewUrl,
      googleDriveDownloadUrl: file.googleDriveDownloadUrl,
      mimeType: file.mimeType,
      size: file.size,
      createdAt: file.createdAt,
    };
  }

  private async downloadAndUploadFile(
    url: string,
    uploadUri: string,
  ): Promise<GoogleFileMetadata> {
    let buffer = Buffer.alloc(0);
    let offset = 0;

    return await new Promise<GoogleFileMetadata>(async (resolve, reject) => {
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

            const fileMetadata = await this.googleDriveService.getFileMetadata(
              res.uploadId,
            );

            this.logger.log("File uploaded successfully:", fileMetadata);

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

      response.on("error", (err) => {
        this.logger.error("Error downloading file:", err);
        reject(err);
      });
    });
  }
}
