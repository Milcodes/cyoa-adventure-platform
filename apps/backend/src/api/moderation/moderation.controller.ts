import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { SubmitForReviewDto } from './dto/submit-for-review.dto';
import { ReviewStoryDto } from './dto/review-story.dto';
import { ModerationQueryDto } from './dto/moderation-query.dto';

/**
 * ModerationController
 *
 * Endpoints:
 * - POST   /moderation/stories/:storyId/submit     - Submit story for review (author)
 * - GET    /moderation/pending                     - Get pending stories (moderator/admin)
 * - GET    /moderation/history                     - Get moderation history (moderator/admin)
 * - GET    /moderation/my-submissions              - Get author's submissions (author)
 * - GET    /moderation/stories/:storyId/status     - Get story moderation status
 * - PATCH  /moderation/:moderationId/review        - Review story (moderator/admin)
 * - DELETE /moderation/:moderationId/cancel        - Cancel submission (author)
 */
@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  /**
   * Submit a story for moderation review
   */
  @Post('stories/:storyId/submit')
  @Roles(UserRole.author, UserRole.admin)
  @HttpCode(HttpStatus.CREATED)
  async submitForReview(
    @GetUser('id') userId: string,
    @Param('storyId') storyId: string,
    @Body() submitDto: SubmitForReviewDto,
  ) {
    return await this.moderationService.submitForReview(
      userId,
      storyId,
      submitDto,
    );
  }

  /**
   * Get pending stories for moderation
   * Moderators and admins only
   */
  @Get('pending')
  @Roles(UserRole.moderator, UserRole.admin)
  async getPendingStories(
    @GetUser('role') role: UserRole,
    @Query() query: ModerationQueryDto,
  ) {
    return await this.moderationService.getPendingStories(role, query);
  }

  /**
   * Get moderation history (all reviews)
   * Moderators and admins only
   */
  @Get('history')
  @Roles(UserRole.moderator, UserRole.admin)
  async getModerationHistory(
    @GetUser('role') role: UserRole,
    @Query() query: ModerationQueryDto,
  ) {
    return await this.moderationService.getModerationHistory(role, query);
  }

  /**
   * Get author's own moderation submissions
   */
  @Get('my-submissions')
  @Roles(UserRole.author, UserRole.admin)
  async getMySubmissions(
    @GetUser('id') userId: string,
    @Query() query: ModerationQueryDto,
  ) {
    return await this.moderationService.getMySubmissions(userId, query);
  }

  /**
   * Get moderation status for a specific story
   */
  @Get('stories/:storyId/status')
  async getModerationStatus(
    @GetUser('id') userId: string,
    @Param('storyId') storyId: string,
  ) {
    return await this.moderationService.getModerationStatus(storyId, userId);
  }

  /**
   * Review a story (approve/reject)
   * Moderators and admins only
   */
  @Patch(':moderationId/review')
  @Roles(UserRole.moderator, UserRole.admin)
  @HttpCode(HttpStatus.OK)
  async reviewStory(
    @GetUser('id') moderatorId: string,
    @GetUser('role') moderatorRole: UserRole,
    @Param('moderationId') moderationId: string,
    @Body() reviewDto: ReviewStoryDto,
  ) {
    return await this.moderationService.reviewStory(
      moderatorId,
      moderatorRole,
      moderationId,
      reviewDto,
    );
  }

  /**
   * Cancel a pending moderation submission
   * Author only
   */
  @Delete(':moderationId/cancel')
  @Roles(UserRole.author, UserRole.admin)
  @HttpCode(HttpStatus.OK)
  async cancelSubmission(
    @GetUser('id') userId: string,
    @Param('moderationId') moderationId: string,
  ) {
    return await this.moderationService.cancelSubmission(userId, moderationId);
  }
}
