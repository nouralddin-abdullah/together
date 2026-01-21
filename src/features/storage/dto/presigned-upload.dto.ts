import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const ALLOWED_CONTENT_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export const PresignedUploadQuerySchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  contentType: z
    .string()
    .min(1, 'Content type is required')
    .refine(
      (type) => ALLOWED_CONTENT_TYPES.includes(type),
      'Only images (jpeg, png, gif, webp) and videos (mp4, webm, mov) are allowed',
    ),
});

export class PresignedUploadQueryDto extends createZodDto(
  PresignedUploadQuerySchema,
) {}

export class PresignedUploadResponseDto {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
  expiresIn: number;
  maxSizeBytes: number;
}
