import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

/**
 * MediaController
 *
 * REST endpoints for file upload and management:
 * - File uploads (images, videos, audio)
 * - Presigned URL generation
 * - File listing and deletion
 */
@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * POST /v1/media/upload
   * Upload a file to S3
   *
   * Form data: file (multipart/form-data)
   * Query params: storyId (optional)
   */
  @Post('upload')
  @Roles(UserRole.author, UserRole.admin)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @GetUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('storyId') storyId?: string,
  ) {
    return await this.mediaService.uploadFile(file, userId, storyId);
  }

  /**
   * GET /v1/media
   * List uploaded files
   *
   * Query params:
   * - storyId (optional): Filter by story
   */
  @Get()
  @Roles(UserRole.author, UserRole.admin)
  async listFiles(
    @GetUser('id') userId: string,
    @Query('storyId') storyId?: string,
  ) {
    return await this.mediaService.listFiles(userId, storyId);
  }

  /**
   * GET /v1/media/:fileName/url
   * Get presigned URL for a file
   *
   * Query params:
   * - expiresIn (optional): Expiration time in seconds (default: 3600)
   */
  @Get(':fileName(*)/url')
  async getPresignedUrl(
    @Param('fileName') fileName: string,
    @Query('expiresIn', new ParseIntPipe({ optional: true }))
    expiresIn?: number,
  ) {
    const url = await this.mediaService.getPresignedUrl(fileName, expiresIn);
    return { url };
  }

  /**
   * DELETE /v1/media/:fileName
   * Delete a file
   */
  @Delete(':fileName(*)')
  @Roles(UserRole.author, UserRole.admin)
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @GetUser('id') userId: string,
    @Param('fileName') fileName: string,
  ) {
    await this.mediaService.deleteFile(fileName, userId);
    return { message: 'File deleted successfully' };
  }
}
