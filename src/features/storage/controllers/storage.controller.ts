import { Controller, Get, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { randomUUID } from 'crypto';

import { CurrentUser } from '@core/decorators';
import { type AuthenticatedUser } from '@shared/types';
import { StorageService } from '../services/storage.service';
import {
  PresignedUploadQueryDto,
  PresignedUploadResponseDto,
} from '../dto/presigned-upload.dto';
import { STORAGE_CONFIG } from '../constants/storage.constants';
import type { StorageConfig } from '../interfaces/storage-config.interface';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  private readonly MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

  constructor(
    private readonly storageService: StorageService,
    @Inject(STORAGE_CONFIG) private readonly config: StorageConfig,
  ) {}

  /**
   * Get a presigned URL for direct upload to S3/R2.
   * Used for chat attachments (images and videos only).
   *
   * Flow:
   * 1. Frontend calls this endpoint to get upload URL
   * 2. Frontend validates file size (max 20MB) before uploading
   * 3. Frontend uploads file directly to the presigned URL (PUT request)
   * 4. Frontend uses the publicUrl in chat message
   *
   * NOTE: File size cannot be enforced server-side with presigned PUT URLs.
   * Frontend MUST validate file.size <= 20MB before uploading.
   */
  @Get('presigned-upload')
  @ApiOperation({ summary: 'Get presigned URL for chat attachment upload' })
  @ApiQuery({ name: 'fileName', description: 'Original file name' })
  @ApiQuery({
    name: 'contentType',
    description: 'MIME type (image/jpeg, image/png, video/mp4, etc.)',
  })
  async getPresignedUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PresignedUploadQueryDto,
  ): Promise<{ success: boolean; data: PresignedUploadResponseDto }> {
    const { fileName, contentType } = query;

    // Generate unique file key
    const extension = fileName.split('.').pop() || '';
    const uniqueId = randomUUID();
    const fileKey = `chat/${user.userId}/${uniqueId}.${extension}`;

    // Get presigned upload URL (valid for 15 minutes)
    const expiresIn = 900;
    const uploadUrl = await this.storageService.getPresignedUploadUrl({
      key: fileKey,
      contentType,
      expiresIn,
    });

    // Build public URL
    const publicUrl = this.config.publicUrl
      ? `${this.config.publicUrl}/${fileKey}`
      : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${fileKey}`;

    return {
      success: true,
      data: {
        uploadUrl,
        fileKey,
        publicUrl,
        expiresIn,
        maxSizeBytes: this.MAX_FILE_SIZE_BYTES,
      },
    };
  }
}
