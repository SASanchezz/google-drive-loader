import { Controller, Post, Get, Body, HttpStatus, HttpCode, Delete, Query } from '@nestjs/common';
import { FilesService } from './files.service';
import { UploadFilesDto } from './dto/upload-files.dto';
import { FileDto } from './dto/file.dto';
import { ApiOperation } from '@nestjs/swagger';
import { DeleteFileDto } from './dto/delete-file.dto';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @ApiOperation({ summary: 'Upload files into Google Drive' })
  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  async uploadFiles(@Body() uploadFilesDto: UploadFilesDto): Promise<FileDto[]> {
    return this.filesService.uploadFiles(uploadFilesDto.urls);
  }

  @ApiOperation({ summary: 'Get all files' })
  @Get('all')
  async getAllFiles(): Promise<FileDto[]> {
    return this.filesService.getAllFiles();
  }

  @ApiOperation({ summary: 'Delete file by original url' })
  @Delete()
  async deleteFile(@Query() deleteFileDto: DeleteFileDto): Promise<FileDto[]> {
    await this.filesService.deleteFile(deleteFileDto.url);
    return this.filesService.getAllFiles();
  }
}