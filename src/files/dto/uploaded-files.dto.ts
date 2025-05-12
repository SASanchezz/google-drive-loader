import { FileDto } from "./file.dto";

export class UploadedFilesDto {
  [key: string]: FileDto | string;
}
