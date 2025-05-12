import { DocumentBuilder } from "@nestjs/swagger";

export const SWAGGER_CONFIG = new DocumentBuilder()
  .setTitle("API Documentation")
  .setDescription("NestJS application to upload files to Google Drive")
  .setVersion("1.0")
  .addTag("files")
  .build();
