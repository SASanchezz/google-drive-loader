import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class DeleteFileDto {
	@ApiProperty({
    description: 'Array of URLs to upload files from',
    type: String,
    example: 'https://example.com/file1.jpg'
  })
  @IsUrl({})
  url: string;
}