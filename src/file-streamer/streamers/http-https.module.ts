import { Module } from "@nestjs/common";
import { HttpHttpService } from "./http-https.service";

@Module({
  exports: [HttpHttpService],
  providers: [HttpHttpService],
})
export class HttpHttpsModule {}
