import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsUrl, ArrayMinSize } from "class-validator";

export class UploadFilesDto {
  @ApiProperty({
    description: "Array of URLs to upload files from",
    type: [String],
    example: [
      "https://example.com/file1.jpg",
      "https://example.com/file2.png",
      "https://example.com/file3.pdf",
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUrl({}, { each: true })
  urls: string[];
}
