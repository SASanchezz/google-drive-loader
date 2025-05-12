import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from './entities/file.entity';

@Injectable()
export class FilesRepository {
  constructor(
    @InjectRepository(FileEntity)
    private fileRepository: Repository<FileEntity>,
  ) {}

  async create(fileData: Partial<FileEntity>): Promise<FileEntity> {
    const FileEntity = this.fileRepository.create(fileData);
    return this.fileRepository.save(FileEntity);
  }

  async findAll(): Promise<FileEntity[]> {
    return this.fileRepository.find();
  }

  async findOne(id: string): Promise<FileEntity> {
    return this.fileRepository.findOne({ where: { id } });
  }

  async findByOriginalUrl(originalUrl: string): Promise<FileEntity> {
    return this.fileRepository.findOne({ where: { originalUrl } });
  }

  async delete(id: string): Promise<void> {
    await this.fileRepository.delete(id);
  }
}