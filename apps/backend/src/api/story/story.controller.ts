import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { StoryService } from './story.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { UserRole } from '@prisma/client';

/**
 * StoryController
 *
 * REST endpoints for story creation and management:
 * - Story CRUD operations
 * - Node management
 * - Publishing workflow
 */
@Controller('stories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  // ==================== STORY MANAGEMENT ====================

  /**
   * POST /v1/stories
   * Create a new story (authors only)
   */
  @Post()
  @Roles(UserRole.author, UserRole.admin)
  @HttpCode(HttpStatus.CREATED)
  async createStory(
    @GetUser('id') userId: string,
    @Body() createStoryDto: CreateStoryDto,
  ) {
    return await this.storyService.createStory(userId, createStoryDto);
  }

  /**
   * GET /v1/stories
   * List stories with optional filters
   */
  @Get()
  async listStories(
    @Query('authorId') authorId?: string,
    @Query('status') status?: 'draft' | 'published' | 'archived',
    @Query('genre') genre?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return await this.storyService.listStories({
      authorId,
      status,
      genre,
      limit,
      offset,
    });
  }

  /**
   * GET /v1/stories/my-stories
   * List current user's stories
   */
  @Get('my-stories')
  @Roles(UserRole.author, UserRole.admin)
  async getMyStories(@GetUser('id') userId: string) {
    return await this.storyService.listStories({
      authorId: userId,
    });
  }

  /**
   * GET /v1/stories/:id
   * Get story details
   */
  @Get(':id')
  async getStory(@Param('id') id: string) {
    return await this.storyService.getStory(id);
  }

  /**
   * PATCH /v1/stories/:id
   * Update story metadata
   */
  @Patch(':id')
  @Roles(UserRole.author, UserRole.admin)
  async updateStory(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateStoryDto: UpdateStoryDto,
  ) {
    return await this.storyService.updateStory(userId, id, updateStoryDto);
  }

  /**
   * DELETE /v1/stories/:id
   * Delete a story
   */
  @Delete(':id')
  @Roles(UserRole.author, UserRole.admin)
  @HttpCode(HttpStatus.OK)
  async deleteStory(@GetUser('id') userId: string, @Param('id') id: string) {
    return await this.storyService.deleteStory(userId, id);
  }

  /**
   * POST /v1/stories/:id/publish
   * Publish a story
   */
  @Post(':id/publish')
  @Roles(UserRole.author, UserRole.admin)
  @HttpCode(HttpStatus.OK)
  async publishStory(@GetUser('id') userId: string, @Param('id') id: string) {
    return await this.storyService.publishStory(userId, id);
  }

  /**
   * POST /v1/stories/:id/unpublish
   * Unpublish a story (set back to draft)
   */
  @Post(':id/unpublish')
  @Roles(UserRole.author, UserRole.admin)
  @HttpCode(HttpStatus.OK)
  async unpublishStory(@GetUser('id') userId: string, @Param('id') id: string) {
    return await this.storyService.unpublishStory(userId, id);
  }

  // ==================== NODE MANAGEMENT ====================

  /**
   * POST /v1/stories/:storyId/nodes
   * Create a new node in a story
   */
  @Post(':storyId/nodes')
  @Roles(UserRole.author, UserRole.admin)
  @HttpCode(HttpStatus.CREATED)
  async createNode(
    @GetUser('id') userId: string,
    @Param('storyId') storyId: string,
    @Body() createNodeDto: CreateNodeDto,
  ) {
    return await this.storyService.createNode(userId, storyId, createNodeDto);
  }

  /**
   * GET /v1/stories/:storyId/nodes
   * List nodes in a story
   */
  @Get(':storyId/nodes')
  async listNodes(@Param('storyId') storyId: string) {
    return await this.storyService.listNodes(storyId);
  }

  /**
   * GET /v1/stories/:storyId/nodes/:nodeId
   * Get node details
   */
  @Get(':storyId/nodes/:nodeId')
  async getNode(@Param('nodeId') nodeId: string) {
    return await this.storyService.getNode(nodeId);
  }

  /**
   * PATCH /v1/stories/:storyId/nodes/:nodeId
   * Update a node
   */
  @Patch(':storyId/nodes/:nodeId')
  @Roles(UserRole.author, UserRole.admin)
  async updateNode(
    @GetUser('id') userId: string,
    @Param('nodeId') nodeId: string,
    @Body() updateNodeDto: UpdateNodeDto,
  ) {
    return await this.storyService.updateNode(userId, nodeId, updateNodeDto);
  }

  /**
   * DELETE /v1/stories/:storyId/nodes/:nodeId
   * Delete a node
   */
  @Delete(':storyId/nodes/:nodeId')
  @Roles(UserRole.author, UserRole.admin)
  @HttpCode(HttpStatus.OK)
  async deleteNode(
    @GetUser('id') userId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return await this.storyService.deleteNode(userId, nodeId);
  }
}
