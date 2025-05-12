import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FilesService } from "./files.service";
import { FilesController } from "./files.controller";
import { GoogleDriveModule } from "src/google-drive/google-drive.module";
import { FilesRepository } from "./files.repository";
import { FileEntity } from "./entities/file.entity";
import { FileStreamerModule } from "src/file-streamer/file-streamer.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity]),
    GoogleDriveModule,
    FileStreamerModule,
  ],
  providers: [FilesService, FilesRepository],
  controllers: [FilesController],
})
export class FilesModule {}
