import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity({ name: "files" })
export class FileEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "original_url" })
  originalUrl: string;

  @Column({ name: "google_drive_id" })
  googleDriveId: string;

  @Column({ name: "google_drive_view_url" })
  googleDriveViewUrl: string;

  @Column({ name: "google_drive_download_url" })
  googleDriveDownloadUrl: string;

  @Column({ name: "mime_type" })
  mimeType: string;

  @Column("bigint")
  size: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
