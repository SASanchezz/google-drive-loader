import { Module } from "@nestjs/common";
import { FileStreamerService } from "./file-streamer.service";
import { HttpHttpsModule } from "./streamers/http-https.module";

@Module({
  imports: [HttpHttpsModule],
  exports: [FileStreamerService],
  providers: [FileStreamerService],
})
export class FileStreamerModule {}
