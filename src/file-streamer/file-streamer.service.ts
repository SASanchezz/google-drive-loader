import { BadRequestException, Injectable } from "@nestjs/common";

import { ReadableData } from "./contracts/ReadableData";
import { HttpHttpService } from "./streamers/http-https.service";
import { Protocol } from "./contracts/Protocol";
import { Streamer } from "./contracts/Streamer";

@Injectable()
export class FileStreamerService {
  constructor(private readonly httpHttpsService: HttpHttpService) {}

  public async getReadableData(url: string): Promise<ReadableData> {
    if (!url) {
      throw new BadRequestException("URL is required");
    }

    const streamer = this.getStreamer(url);

    return await streamer.getReadableData(url);
  }

  private getStreamer(url: string): Streamer {
    if (url.startsWith(Protocol.HTTP) || url.startsWith(Protocol.HTTPS)) {
      return this.httpHttpsService;
    }

    /**
     * @TODO Create new streamers for (S)FTP, local files.
     */
    throw new BadRequestException("Unsupported URL protocol. Only HTTP and HTTPS are supported.");
  }
}
