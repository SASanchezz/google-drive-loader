import { BadRequestException, Injectable } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';

import { ReadableData } from '../contracts/ReadableData';


@Injectable()
export class HttpHttpService {
  async getReadableData(url: string): Promise<ReadableData> {
    const protocol = url.startsWith('https') ? https : http;

    return new Promise((resolve, reject) => {
      protocol.get(url, (response) => {
        const { statusCode, headers } = response;
        if (statusCode >= 400) {
          response.resume();
          return reject(new BadRequestException(`Failed to download file, status code: ${response.statusCode}`));
        }
        const mimeType = headers['content-type'] || 'application/octet-stream';
        const fileSize = parseInt(headers['content-length'] || '0', 10);

        if (!fileSize || fileSize < 0) {
          response.resume();
          return reject(new BadRequestException('Content-Length header is missing or invalid'));
        }

        resolve({
          stream: response,
          mimeType,
          fileSize,
        });
      }).on('error', reject);
    });
  }
}
