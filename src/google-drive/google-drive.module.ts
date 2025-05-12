import { Module } from "@nestjs/common";
import { GoogleDriveService } from "./google-drive.service";

@Module({
  imports: [],
  providers: [GoogleDriveService],
  exports: [GoogleDriveService],
})
export class GoogleDriveModule {}
