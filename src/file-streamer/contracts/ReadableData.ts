import { Readable } from "stream";

export interface ReadableData {
  stream: Readable;
  mimeType: string;
  fileSize: number;
}