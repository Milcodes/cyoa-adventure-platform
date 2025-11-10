import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { TranslationService } from './translation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CreateStoryTranslationDto } from './dto/create-story-translation.dto';
import { UpdateStoryTranslationDto } from './dto/update-story-translation.dto';
import { CreateNodeTranslationDto } from './dto/create-node-translation.dto';
import { UpdateNodeTranslationDto } from './dto/update-node-translation.dto';
import { UserRole } from '@prisma/client';

/**
 * TranslationController
 *
 * REST endpoints for translation management:
 * - Story translations CRUD
 * - Node translations CRUD
 * - Translation progress tracking
 */
@Controller('translations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  // ==================== STORY TRANSLATIONS ====================

  /**
   * POST /v1/translations/stories/:storyId
   * Create a new story translation
   */
  @Post('stories/:storyId')
  @Roles(UserRole.author, UserRole.admin)
  @HttpCode(HttpStatus.CREATED)
  async createStoryTranslation(
    @GetUser('id') userId: string,
    @Param('storyId') storyId: string,
    @Body() createDto: CreateStoryTranslationDto,
  ) {
    return await this.translationService.createStoryTranslation(
      userId,
      storyId,
      createDto,
    );
  }

  /**
   * GET /v1/translations/stories/:storyId
   * List all translations for a story
   */
  @Get('stories/:storyId')
  async listStoryTranslations(@Param('storyId') storyId: string) {
    return await this.translationService.listStoryTranslations(storyId);
  }

  /**
   * GET /v1/translations/stories/:storyId/:locale
   * Get a specific story translation
   */
  @Get('stories/:storyId/:locale')
  async getStoryTranslation(
    @Param('storyId') storyId: string,
    @Param('locale') locale: string,
  ) {
    return await this.translationService.getStoryTranslation(storyId, locale);
  }

  /**
   * PATCH /v1/translations/stories/:storyId/:locale
   * Update a story translation
   */
  @Patch('stories/:storyId/:locale')
  @Roles(UserRole.author, UserRole.admin)
  async updateStoryTranslation(
    @GetUser('id') userId: string,
    @Param('storyId') storyId: string,
    @Param('locale') locale: string,
    @Body() updateDto: UpdateStoryTranslationDto,
  ) {
    return await this.translationService.updateStoryTranslation(
      userId,
      storyId,
      locale,
      updateDto,
    );
  }

  /**
   * DELETE /v1/translations/stories/:storyId/:locale
   * Delete a story translation
   */
  @Delete('stories/:storyId/:locale')
  @Roles(UserRole.author, UserRole.admin)
  @HttpCode(HttpStatus.OK)
  async deleteStoryTranslation(
    @GetUser('id') userId: string,
    @Param('storyId') storyId: string,
    @Param('locale') locale: string,
  ) {
    return await this.translationService.deleteStoryTranslation(
      userId,
      storyId,
      locale,
    );
  }

  /**
   * GET /v1/translations/stories/:storyId/progress
   * Get translation progress for a story
   */
  @Get('stories/:storyId/progress')
  async getStoryTranslationProgress(@Param('storyId') storyId: string) {
    return await this.translationService.getStoryTranslationProgress(storyId);
  }

  // ==================== NODE TRANSLATIONS ====================

  /**
   * POST /v1/translations/nodes/:nodeId
   * Create a new node translation
   */
  @Post('nodes/:nodeId')
  @Roles(UserRole.author, UserRole.admin)
  @HttpCode(HttpStatus.CREATED)
  async createNodeTranslation(
    @GetUser('id') userId: string,
    @Param('nodeId') nodeId: string,
    @Body() createDto: CreateNodeTranslationDto,
  ) {
    return await this.translationService.createNodeTranslation(
      userId,
      nodeId,
      createDto,
    );
  }

  /**
   * GET /v1/translations/nodes/:nodeId
   * List all translations for a node
   */
  @Get('nodes/:nodeId')
  async listNodeTranslations(@Param('nodeId') nodeId: string) {
    return await this.translationService.listNodeTranslations(nodeId);
  }

  /**
   * GET /v1/translations/nodes/:nodeId/:locale
   * Get a specific node translation
   */
  @Get('nodes/:nodeId/:locale')
  async getNodeTranslation(
    @Param('nodeId') nodeId: string,
    @Param('locale') locale: string,
  ) {
    return await this.translationService.getNodeTranslation(nodeId, locale);
  }

  /**
   * PATCH /v1/translations/nodes/:nodeId/:locale
   * Update a node translation
   */
  @Patch('nodes/:nodeId/:locale')
  @Roles(UserRole.author, UserRole.admin)
  async updateNodeTranslation(
    @GetUser('id') userId: string,
    @Param('nodeId') nodeId: string,
    @Param('locale') locale: string,
    @Body() updateDto: UpdateNodeTranslationDto,
  ) {
    return await this.translationService.updateNodeTranslation(
      userId,
      nodeId,
      locale,
      updateDto,
    );
  }

  /**
   * DELETE /v1/translations/nodes/:nodeId/:locale
   * Delete a node translation
   */
  @Delete('nodes/:nodeId/:locale')
  @Roles(UserRole.author, UserRole.admin)
  @HttpCode(HttpStatus.OK)
  async deleteNodeTranslation(
    @GetUser('id') userId: string,
    @Param('nodeId') nodeId: string,
    @Param('locale') locale: string,
  ) {
    return await this.translationService.deleteNodeTranslation(
      userId,
      nodeId,
      locale,
    );
  }
}
