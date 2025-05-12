import { BadRequestException, Injectable } from "@nestjs/common";

import { ReadableData } from "./contracts/ReadableData";
import { HttpHttpService } from "./streamers/http-https.service";
import { Protocol } from "./contracts/Protocol";

@Injectable()
export class FileStreamerService {
  constructor(private readonly httpHttpsService: HttpHttpService) {}

  async getReadableData(url: string): Promise<ReadableData> {
    if (!url) {
      throw new BadRequestException("URL is required");
    }

    if (url.startsWith(Protocol.HTTP) || url.startsWith(Protocol.HTTPS)) {
      return this.httpHttpsService.getReadableData(url);
    }
    /**
     * @TODO Create new streamers for (S)FTP, local files.
     */

    throw new BadRequestException(
      "Unsupported URL protocol. Only HTTP and HTTPS are supported.",
    );
  }
}
