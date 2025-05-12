import { ReadableData } from "./ReadableData";

export interface Streamer {
  getReadableData(url: string): Promise<ReadableData>;
}
