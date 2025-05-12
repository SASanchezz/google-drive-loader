import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FilesModule } from './files/files.module';
import { GoogleDriveModule } from './google-drive/google-drive.module';
import { DatabaseModule } from './database/database.module';
import { FileStreamerModule } from './file-streamer/file-streamer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    DatabaseModule,
    FilesModule,
    GoogleDriveModule,
    FileStreamerModule
  ],
  providers: [],
})
export class AppModule {}
