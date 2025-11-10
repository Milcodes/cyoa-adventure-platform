import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

/**
 * MediaModule
 *
 * Provides REST API endpoints for file upload and management.
 * Integrates with S3/MinIO for object storage.
 */
@Module({
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
