import { Module } from '@nestjs/common';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';

/**
 * StoryModule
 *
 * Provides REST API endpoints for story creation and management.
 * Restricted to authors and admins.
 */
@Module({
  controllers: [StoryController],
  providers: [StoryService],
  exports: [StoryService],
})
export class StoryModule {}
