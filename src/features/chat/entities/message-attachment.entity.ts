import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Message } from './message.entity';

/**
 * Attachment types supported in chat
 */
export enum AttachmentType {
  IMAGE = 'image',
  VIDEO = 'video',
}

/**
 * MessageAttachment Entity
 *
 * Stores metadata about a file attached to a message.
 * The actual file is stored in S3/R2 (via your StorageModule).
 * This entity just holds the URL and metadata.
 *
 * OneToOne relationship with Message - each attachment belongs to exactly one message.
 */
@Entity('message_attachments')
export class MessageAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Foreign key to the message this attachment belongs to.
   */
  @Column()
  messageId: string;

  @OneToOne(() => Message, (message) => message.attachment, {
    onDelete: 'CASCADE', // Delete attachment when message is deleted
  })
  @JoinColumn({ name: 'messageId' })
  message: Message;

  /**
   * The URL where the file is stored (S3/R2 URL).
   * This is what the client uses to display the image/video.
   */
  @Column()
  url: string;

  /**
   * Type of attachment: 'image' or 'video'
   */
  @Column({
    type: 'varchar',
    default: AttachmentType.IMAGE,
  })
  type: AttachmentType;

  /**
   * Original filename (e.g., "vacation-photo.jpg")
   */
  @Column({ type: 'varchar', nullable: true })
  fileName: string | null;

  /**
   * File size in bytes
   */
  @Column({ type: 'int', nullable: true })
  fileSize: number | null;

  /**
   * MIME type (e.g., "image/jpeg", "video/mp4")
   */
  @Column({ type: 'varchar', nullable: true })
  mimeType: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
