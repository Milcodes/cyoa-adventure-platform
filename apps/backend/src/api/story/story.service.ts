import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';

/**
 * StoryService
 *
 * Handles story creation and management:
 * - Creating, updating, deleting stories
 * - Managing story nodes
 * - Publishing stories
 * - Authorization (author ownership)
 */
@Injectable()
export class StoryService {
  private readonly logger = new Logger(StoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new story (draft status)
   *
   * @param userId - Author's user ID
   * @param createStoryDto - Story creation data
   * @returns Created story
   */
  async createStory(userId: string, createStoryDto: CreateStoryDto) {
    const {
      slug,
      title,
      synopsis,
      genre,
      coverUrl,
      primaryLanguage = 'hu',
      availableLanguages = ['hu'],
    } = createStoryDto;

    // Check if slug already exists
    const existingStory = await this.prisma.story.findUnique({
      where: { slug },
    });

    if (existingStory) {
      throw new ConflictException(`Story with slug '${slug}' already exists`);
    }

    // Create story
    const story = await this.prisma.story.create({
      data: {
        slug,
        title,
        synopsis,
        genre,
        cover_url: coverUrl,
        status: 'draft',
        created_by: userId,
        primary_language: primaryLanguage,
        available_languages: availableLanguages,
      },
    });

    this.logger.log(`Story created: ${story.id} by user ${userId}`);

    return story;
  }

  /**
   * List stories with optional filters
   *
   * @param filters - Filter options
   * @returns List of stories
   */
  async listStories(filters: {
    authorId?: string;
    status?: 'draft' | 'published' | 'archived';
    genre?: string;
    limit?: number;
    offset?: number;
  }) {
    const { authorId, status, genre, limit = 20, offset = 0 } = filters;

    const stories = await this.prisma.story.findMany({
      where: {
        ...(authorId && { created_by: authorId }),
        ...(status && { status }),
        ...(genre && { genre }),
      },
      include: {
        author: {
          select: {
            id: true,
            display_name: true,
          },
        },
        _count: {
          select: {
            nodes: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return stories;
  }

  /**
   * Get story by ID
   *
   * @param storyId - Story ID
   * @returns Story details
   */
  async getStory(storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        author: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
        nodes: {
          select: {
            id: true,
            key: true,
            is_terminal: true,
            created_at: true,
            updated_at: true,
          },
        },
        _count: {
          select: {
            translations: true,
            saves: true,
          },
        },
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    return story;
  }

  /**
   * Update story metadata
   *
   * @param userId - User ID (for authorization)
   * @param storyId - Story ID
   * @param updateStoryDto - Update data
   * @returns Updated story
   */
  async updateStory(
    userId: string,
    storyId: string,
    updateStoryDto: UpdateStoryDto,
  ) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    // Check ownership
    if (story.created_by !== userId) {
      throw new ForbiddenException('You can only edit your own stories');
    }

    const updatedStory = await this.prisma.story.update({
      where: { id: storyId },
      data: {
        ...(updateStoryDto.title && { title: updateStoryDto.title }),
        ...(updateStoryDto.synopsis !== undefined && {
          synopsis: updateStoryDto.synopsis,
        }),
        ...(updateStoryDto.genre !== undefined && { genre: updateStoryDto.genre }),
        ...(updateStoryDto.coverUrl !== undefined && {
          cover_url: updateStoryDto.coverUrl,
        }),
        ...(updateStoryDto.availableLanguages && {
          available_languages: updateStoryDto.availableLanguages,
        }),
      },
    });

    this.logger.log(`Story updated: ${storyId}`);

    return updatedStory;
  }

  /**
   * Delete a story
   *
   * @param userId - User ID (for authorization)
   * @param storyId - Story ID
   */
  async deleteStory(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        _count: {
          select: {
            saves: true,
          },
        },
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    // Check ownership
    if (story.created_by !== userId) {
      throw new ForbiddenException('You can only delete your own stories');
    }

    // Prevent deletion if there are active saves
    if (story._count.saves > 0) {
      throw new BadRequestException(
        'Cannot delete story with active player saves',
      );
    }

    await this.prisma.story.delete({
      where: { id: storyId },
    });

    this.logger.log(`Story deleted: ${storyId}`);

    return { message: 'Story deleted successfully' };
  }

  /**
   * Publish a story
   *
   * @param userId - User ID (for authorization)
   * @param storyId - Story ID
   * @returns Updated story
   */
  async publishStory(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        nodes: {
          where: { key: 'start' },
        },
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    // Check ownership
    if (story.created_by !== userId) {
      throw new ForbiddenException('You can only publish your own stories');
    }

    // Validate story has a start node
    if (story.nodes.length === 0) {
      throw new BadRequestException(
        'Story must have a start node before publishing',
      );
    }

    const updatedStory = await this.prisma.story.update({
      where: { id: storyId },
      data: {
        status: 'published',
        version: { increment: 1 },
      },
    });

    this.logger.log(`Story published: ${storyId} (v${updatedStory.version})`);

    return updatedStory;
  }

  /**
   * Unpublish a story (set back to draft)
   *
   * @param userId - User ID (for authorization)
   * @param storyId - Story ID
   * @returns Updated story
   */
  async unpublishStory(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    // Check ownership
    if (story.created_by !== userId) {
      throw new ForbiddenException('You can only unpublish your own stories');
    }

    const updatedStory = await this.prisma.story.update({
      where: { id: storyId },
      data: {
        status: 'draft',
      },
    });

    this.logger.log(`Story unpublished: ${storyId}`);

    return updatedStory;
  }

  // ==================== NODE MANAGEMENT ====================

  /**
   * Create a new node in a story
   *
   * @param userId - User ID (for authorization)
   * @param storyId - Story ID
   * @param createNodeDto - Node creation data
   * @returns Created node
   */
  async createNode(
    userId: string,
    storyId: string,
    createNodeDto: CreateNodeDto,
  ) {
    // Verify story exists and user owns it
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.created_by !== userId) {
      throw new ForbiddenException('You can only edit your own stories');
    }

    // Check if node key already exists in this story
    const existingNode = await this.prisma.storyNode.findFirst({
      where: {
        story_id: storyId,
        key: createNodeDto.key,
      },
    });

    if (existingNode) {
      throw new ConflictException(
        `Node with key '${createNodeDto.key}' already exists in this story`,
      );
    }

    const node = await this.prisma.storyNode.create({
      data: {
        story_id: storyId,
        key: createNodeDto.key,
        text_md: createNodeDto.textMd,
        media_ref: createNodeDto.mediaRef,
        layout: createNodeDto.layout || 'image',
        dice_checks: createNodeDto.diceChecks || [],
        conditions: createNodeDto.conditions || [],
        effects: createNodeDto.effects || [],
        choices: createNodeDto.choices || [],
        is_terminal: createNodeDto.isTerminal || false,
      },
    });

    this.logger.log(`Node created: ${node.id} in story ${storyId}`);

    return node;
  }

  /**
   * List nodes in a story
   *
   * @param storyId - Story ID
   * @returns List of nodes
   */
  async listNodes(storyId: string) {
    const nodes = await this.prisma.storyNode.findMany({
      where: { story_id: storyId },
      include: {
        translations: {
          select: {
            id: true,
            locale: true,
            translation_status: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return nodes;
  }

  /**
   * Get node by ID
   *
   * @param nodeId - Node ID
   * @returns Node details
   */
  async getNode(nodeId: string) {
    const node = await this.prisma.storyNode.findUnique({
      where: { id: nodeId },
      include: {
        story: {
          select: {
            id: true,
            title: true,
            created_by: true,
          },
        },
        translations: true,
      },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    return node;
  }

  /**
   * Update a node
   *
   * @param userId - User ID (for authorization)
   * @param nodeId - Node ID
   * @param updateNodeDto - Update data
   * @returns Updated node
   */
  async updateNode(
    userId: string,
    nodeId: string,
    updateNodeDto: UpdateNodeDto,
  ) {
    const node = await this.prisma.storyNode.findUnique({
      where: { id: nodeId },
      include: {
        story: true,
      },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    // Check ownership
    if (node.story.created_by !== userId) {
      throw new ForbiddenException('You can only edit your own stories');
    }

    const updatedNode = await this.prisma.storyNode.update({
      where: { id: nodeId },
      data: {
        ...(updateNodeDto.textMd && { text_md: updateNodeDto.textMd }),
        ...(updateNodeDto.mediaRef !== undefined && {
          media_ref: updateNodeDto.mediaRef,
        }),
        ...(updateNodeDto.layout && { layout: updateNodeDto.layout }),
        ...(updateNodeDto.diceChecks && { dice_checks: updateNodeDto.diceChecks }),
        ...(updateNodeDto.conditions && { conditions: updateNodeDto.conditions }),
        ...(updateNodeDto.effects && { effects: updateNodeDto.effects }),
        ...(updateNodeDto.choices && { choices: updateNodeDto.choices }),
        ...(updateNodeDto.isTerminal !== undefined && {
          is_terminal: updateNodeDto.isTerminal,
        }),
      },
    });

    this.logger.log(`Node updated: ${nodeId}`);

    return updatedNode;
  }

  /**
   * Delete a node
   *
   * @param userId - User ID (for authorization)
   * @param nodeId - Node ID
   */
  async deleteNode(userId: string, nodeId: string) {
    const node = await this.prisma.storyNode.findUnique({
      where: { id: nodeId },
      include: {
        story: true,
      },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    // Check ownership
    if (node.story.created_by !== userId) {
      throw new ForbiddenException('You can only edit your own stories');
    }

    // Prevent deletion of start node
    if (node.key === 'start') {
      throw new BadRequestException('Cannot delete the start node');
    }

    await this.prisma.storyNode.delete({
      where: { id: nodeId },
    });

    this.logger.log(`Node deleted: ${nodeId}`);

    return { message: 'Node deleted successfully' };
  }
}
