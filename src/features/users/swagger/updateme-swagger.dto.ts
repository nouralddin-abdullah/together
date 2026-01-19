import { ApiPropertyOptional } from '@nestjs/swagger';

// this is for clean way with swagger documentation, validation is handled by create user dto with zod
export class UpdateMeSwaggerDto {
  @ApiPropertyOptional({ example: 'johndoe', minLength: 3, maxLength: 20 })
  username?: string;

  @ApiPropertyOptional({ example: 'John', minLength: 2, maxLength: 50 })
  nickName?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Profile picture',
  })
  avatar?: Express.Multer.File;
}
