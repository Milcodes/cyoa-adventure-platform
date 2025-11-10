import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModerationStatus, UserRole } from '@prisma/client';
import { SubmitForReviewDto } from './dto/submit-for-review.dto';
import { ReviewStoryDto } from './dto/review-story.dto';
import { ModerationQueryDto } from './dto/moderation-query.dto';

/**
 * ModerationService
 *
 * Handles content moderation workflow:
 * - Authors submit stories for review
 * - Moderators approve/reject stories
 * - Track moderation history
 * - Query pending/reviewed submissions
 */
@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit a story for moderation review
   *
   * @param userId - Author's user ID
   * @param storyId - Story ID to submit
   * @param submitDto - Optional notes
   * @returns Created moderation record
   */
  async submitForReview(
    userId: string,
    storyId: string,
    submitDto: SubmitForReviewDto,
  ) {
    // Verify story exists and user is the author
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        nodes: true,
        moderation: true,
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.created_by !== userId) {
      throw new ForbiddenException('You can only submit your own stories');
    }

    // Check if story is draft (must be draft to submit)
    if (story.status === 'published') {
      throw new BadRequestException(
        'Published stories cannot be submitted for review',
      );
    }

    // Check if already has a pending/approved moderation
    if (story.moderation) {
      if (story.moderation.status === 'pending') {
        throw new ConflictException(
          'Story is already pending moderation review',
        );
      }
      if (story.moderation.status === 'approved') {
        throw new ConflictException('Story is already approved');
      }
    }

    // Check if story has at least one node (start node)
    if (story.nodes.length === 0) {
      throw new BadRequestException(
        'Story must have at least one node to be submitted',
      );
    }

    // Check if story has a start node
    const hasStartNode = story.nodes.some((node) => node.key === 'start');
    if (!hasStartNode) {
      throw new BadRequestException(
        'Story must have a "start" node to be submitted',
      );
    }

    // Create or update moderation record
    const moderation = await this.prisma.contentModeration.upsert({
      where: { story_id: storyId },
      create: {
        story_id: storyId,
        author_id: userId,
        status: ModerationStatus.pending,
        notes: submitDto.notes,
        submitted_at: new Date(),
      },
      update: {
        status: ModerationStatus.pending,
        notes: submitDto.notes,
        submitted_at: new Date(),
        moderator_id: null,
        reviewed_at: null,
      },
      include: {
        story: {
          select: {
            id: true,
            title: true,
            slug: true,
            synopsis: true,
            genre: true,
            status: true,
          },
        },
        author: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(
      `Story submitted for review: ${storyId} by user ${userId}`,
    );

    return moderation;
  }

  /**
   * Review a story (approve/reject)
   * Only moderators and admins can review
   *
   * @param moderatorId - Moderator's user ID
   * @param moderatorRole - Moderator's role
   * @param moderationId - Moderation record ID
   * @param reviewDto - Review decision and notes
   * @returns Updated moderation record
   */
  async reviewStory(
    moderatorId: string,
    moderatorRole: UserRole,
    moderationId: string,
    reviewDto: ReviewStoryDto,
  ) {
    // Only moderators and admins can review
    if (moderatorRole !== UserRole.moderator && moderatorRole !== UserRole.admin) {
      throw new ForbiddenException('Only moderators and admins can review stories');
    }

    // Verify moderation record exists
    const moderation = await this.prisma.contentModeration.findUnique({
      where: { id: moderationId },
      include: {
        story: true,
        author: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
      },
    });

    if (!moderation) {
      throw new NotFoundException('Moderation record not found');
    }

    // Check if already reviewed
    if (moderation.status !== ModerationStatus.pending) {
      throw new BadRequestException(
        `Story has already been ${moderation.status}`,
      );
    }

    // Validate status
    if (reviewDto.status === ModerationStatus.pending) {
      throw new BadRequestException(
        'Cannot set status to pending during review',
      );
    }

    // Update moderation record
    const updatedModeration = await this.prisma.contentModeration.update({
      where: { id: moderationId },
      data: {
        status: reviewDto.status,
        notes: reviewDto.notes,
        moderator_id: moderatorId,
        reviewed_at: new Date(),
      },
      include: {
        story: {
          select: {
            id: true,
            title: true,
            slug: true,
            synopsis: true,
            status: true,
          },
        },
        author: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
        moderator: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
      },
    });

    // If approved, update story status to published
    if (reviewDto.status === ModerationStatus.approved) {
      await this.prisma.story.update({
        where: { id: moderation.story_id },
        data: { status: 'published' },
      });

      this.logger.log(
        `Story approved and published: ${moderation.story_id} by moderator ${moderatorId}`,
      );
    } else if (reviewDto.status === ModerationStatus.rejected) {
      this.logger.log(
        `Story rejected: ${moderation.story_id} by moderator ${moderatorId}. Reason: ${reviewDto.notes}`,
      );
    }

    return updatedModeration;
  }

  /**
   * Get pending stories for moderation
   * Only moderators and admins can access
   *
   * @param moderatorRole - Moderator's role
   * @param query - Query filters
   * @returns List of pending moderation records
   */
  async getPendingStories(moderatorRole: UserRole, query: ModerationQueryDto) {
    // Only moderators and admins can access
    if (moderatorRole !== UserRole.moderator && moderatorRole !== UserRole.admin) {
      throw new ForbiddenException('Only moderators and admins can view pending stories');
    }

    const limit = query.limit || 20;
    const offset = query.offset || 0;
    const status = query.status || ModerationStatus.pending;

    const [items, total] = await Promise.all([
      this.prisma.contentModeration.findMany({
        where: { status },
        take: limit,
        skip: offset,
        orderBy: { submitted_at: 'asc' }, // Oldest first (FIFO)
        include: {
          story: {
            select: {
              id: true,
              title: true,
              slug: true,
              synopsis: true,
              genre: true,
              status: true,
              created_at: true,
            },
          },
          author: {
            select: {
              id: true,
              display_name: true,
              email: true,
            },
          },
          moderator: {
            select: {
              id: true,
              display_name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.contentModeration.count({
        where: { status },
      }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get moderation status for a specific story
   *
   * @param storyId - Story ID
   * @param userId - User ID (for authorization)
   * @returns Moderation record
   */
  async getModerationStatus(storyId: string, userId: string) {
    const moderation = await this.prisma.contentModeration.findUnique({
      where: { story_id: storyId },
      include: {
        story: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            created_by: true,
          },
        },
        author: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
        moderator: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
      },
    });

    if (!moderation) {
      throw new NotFoundException('Moderation record not found for this story');
    }

    // Only author or moderators/admins can view
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const canView =
      moderation.author_id === userId ||
      user?.role === UserRole.moderator ||
      user?.role === UserRole.admin;

    if (!canView) {
      throw new ForbiddenException(
        'You do not have permission to view this moderation record',
      );
    }

    return moderation;
  }

  /**
   * Get author's own moderation submissions
   *
   * @param authorId - Author's user ID
   * @param query - Query filters
   * @returns List of author's moderation records
   */
  async getMySubmissions(authorId: string, query: ModerationQueryDto) {
    const limit = query.limit || 20;
    const offset = query.offset || 0;

    const where: any = { author_id: authorId };
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.contentModeration.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { submitted_at: 'desc' }, // Most recent first
        include: {
          story: {
            select: {
              id: true,
              title: true,
              slug: true,
              synopsis: true,
              status: true,
            },
          },
          moderator: {
            select: {
              id: true,
              display_name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.contentModeration.count({ where }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get moderation history (all reviews)
   * Only for moderators and admins
   *
   * @param moderatorRole - Moderator's role
   * @param query - Query filters
   * @returns List of all moderation records
   */
  async getModerationHistory(moderatorRole: UserRole, query: ModerationQueryDto) {
    // Only moderators and admins can access
    if (moderatorRole !== UserRole.moderator && moderatorRole !== UserRole.admin) {
      throw new ForbiddenException('Only moderators and admins can view moderation history');
    }

    const limit = query.limit || 20;
    const offset = query.offset || 0;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.contentModeration.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { reviewed_at: 'desc' }, // Most recent reviews first
        include: {
          story: {
            select: {
              id: true,
              title: true,
              slug: true,
              synopsis: true,
              genre: true,
              status: true,
            },
          },
          author: {
            select: {
              id: true,
              display_name: true,
              email: true,
            },
          },
          moderator: {
            select: {
              id: true,
              display_name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.contentModeration.count({ where }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  /**
   * Cancel a pending moderation submission
   * Only author can cancel their own submission
   *
   * @param authorId - Author's user ID
   * @param moderationId - Moderation record ID
   * @returns Deleted moderation record
   */
  async cancelSubmission(authorId: string, moderationId: string) {
    const moderation = await this.prisma.contentModeration.findUnique({
      where: { id: moderationId },
    });

    if (!moderation) {
      throw new NotFoundException('Moderation record not found');
    }

    if (moderation.author_id !== authorId) {
      throw new ForbiddenException('You can only cancel your own submissions');
    }

    if (moderation.status !== ModerationStatus.pending) {
      throw new BadRequestException(
        `Cannot cancel a ${moderation.status} submission`,
      );
    }

    await this.prisma.contentModeration.delete({
      where: { id: moderationId },
    });

    this.logger.log(`Moderation submission cancelled: ${moderationId}`);

    return { message: 'Submission cancelled successfully' };
  }
}
