import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStoryTranslationDto } from './dto/create-story-translation.dto';
import { UpdateStoryTranslationDto } from './dto/update-story-translation.dto';
import { CreateNodeTranslationDto } from './dto/create-node-translation.dto';
import { UpdateNodeTranslationDto } from './dto/update-node-translation.dto';

/**
 * TranslationService
 *
 * Handles translation management for stories and nodes:
 * - Creating translations in different locales
 * - Updating translation content and status
 * - Managing translator assignments
 * - Listing available translations
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== STORY TRANSLATIONS ====================

  /**
   * Create a new story translation
   *
   * @param userId - User ID (translator)
   * @param storyId - Story ID
   * @param createDto - Translation data
   * @returns Created translation
   */
  async createStoryTranslation(
    userId: string,
    storyId: string,
    createDto: CreateStoryTranslationDto,
  ) {
    // Verify story exists and user owns it or is admin/moderator
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    // Check if translation already exists for this locale
    const existingTranslation = await this.prisma.storyTranslation.findUnique({
      where: {
        story_id_locale: {
          story_id: storyId,
          locale: createDto.locale,
        },
      },
    });

    if (existingTranslation) {
      throw new ConflictException(
        `Translation for locale '${createDto.locale}' already exists`,
      );
    }

    const translation = await this.prisma.storyTranslation.create({
      data: {
        story_id: storyId,
        locale: createDto.locale,
        title: createDto.title,
        synopsis: createDto.synopsis,
        translation_status: createDto.translationStatus || 'incomplete',
        translated_by: userId,
      },
    });

    this.logger.log(
      `Story translation created: ${translation.id} (${createDto.locale})`,
    );

    return translation;
  }

  /**
   * List translations for a story
   *
   * @param storyId - Story ID
   * @returns List of translations
   */
  async listStoryTranslations(storyId: string) {
    const translations = await this.prisma.storyTranslation.findMany({
      where: { story_id: storyId },
      include: {
        translator: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        locale: 'asc',
      },
    });

    return translations;
  }

  /**
   * Get a specific story translation
   *
   * @param storyId - Story ID
   * @param locale - Locale code
   * @returns Translation details
   */
  async getStoryTranslation(storyId: string, locale: string) {
    const translation = await this.prisma.storyTranslation.findUnique({
      where: {
        story_id_locale: {
          story_id: storyId,
          locale,
        },
      },
      include: {
        translator: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
        story: {
          select: {
            id: true,
            title: true,
            created_by: true,
          },
        },
      },
    });

    if (!translation) {
      throw new NotFoundException('Translation not found');
    }

    return translation;
  }

  /**
   * Update a story translation
   *
   * @param userId - User ID (for authorization)
   * @param storyId - Story ID
   * @param locale - Locale code
   * @param updateDto - Update data
   * @returns Updated translation
   */
  async updateStoryTranslation(
    userId: string,
    storyId: string,
    locale: string,
    updateDto: UpdateStoryTranslationDto,
  ) {
    const translation = await this.prisma.storyTranslation.findUnique({
      where: {
        story_id_locale: {
          story_id: storyId,
          locale,
        },
      },
      include: {
        story: true,
      },
    });

    if (!translation) {
      throw new NotFoundException('Translation not found');
    }

    // Check authorization (story owner or translator)
    if (
      translation.story.created_by !== userId &&
      translation.translated_by !== userId
    ) {
      throw new ForbiddenException(
        'You can only edit translations for your own stories or translations you created',
      );
    }

    const updated = await this.prisma.storyTranslation.update({
      where: {
        story_id_locale: {
          story_id: storyId,
          locale,
        },
      },
      data: {
        ...(updateDto.title && { title: updateDto.title }),
        ...(updateDto.synopsis !== undefined && {
          synopsis: updateDto.synopsis,
        }),
        ...(updateDto.translationStatus && {
          translation_status: updateDto.translationStatus,
        }),
      },
    });

    this.logger.log(`Story translation updated: ${updated.id}`);

    return updated;
  }

  /**
   * Delete a story translation
   *
   * @param userId - User ID (for authorization)
   * @param storyId - Story ID
   * @param locale - Locale code
   */
  async deleteStoryTranslation(
    userId: string,
    storyId: string,
    locale: string,
  ) {
    const translation = await this.prisma.storyTranslation.findUnique({
      where: {
        story_id_locale: {
          story_id: storyId,
          locale,
        },
      },
      include: {
        story: true,
      },
    });

    if (!translation) {
      throw new NotFoundException('Translation not found');
    }

    // Check authorization (story owner or translator)
    if (
      translation.story.created_by !== userId &&
      translation.translated_by !== userId
    ) {
      throw new ForbiddenException(
        'You can only delete translations for your own stories or translations you created',
      );
    }

    await this.prisma.storyTranslation.delete({
      where: {
        story_id_locale: {
          story_id: storyId,
          locale,
        },
      },
    });

    this.logger.log(`Story translation deleted: ${translation.id}`);

    return { message: 'Translation deleted successfully' };
  }

  // ==================== NODE TRANSLATIONS ====================

  /**
   * Create a new node translation
   *
   * @param userId - User ID (translator)
   * @param nodeId - Node ID
   * @param createDto - Translation data
   * @returns Created translation
   */
  async createNodeTranslation(
    userId: string,
    nodeId: string,
    createDto: CreateNodeTranslationDto,
  ) {
    // Verify node exists and get story owner
    const node = await this.prisma.storyNode.findUnique({
      where: { id: nodeId },
      include: {
        story: true,
      },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    // Check if translation already exists for this locale
    const existingTranslation = await this.prisma.nodeTranslation.findUnique({
      where: {
        node_id_locale: {
          node_id: nodeId,
          locale: createDto.locale,
        },
      },
    });

    if (existingTranslation) {
      throw new ConflictException(
        `Translation for locale '${createDto.locale}' already exists`,
      );
    }

    const translation = await this.prisma.nodeTranslation.create({
      data: {
        node_id: nodeId,
        locale: createDto.locale,
        text_md: createDto.textMd,
        ...(createDto.choicesLabels && { choices_labels: createDto.choicesLabels }),
        translation_status: createDto.translationStatus || 'incomplete',
        translated_by: userId,
      },
    });

    this.logger.log(
      `Node translation created: ${translation.id} (${createDto.locale})`,
    );

    return translation;
  }

  /**
   * List translations for a node
   *
   * @param nodeId - Node ID
   * @returns List of translations
   */
  async listNodeTranslations(nodeId: string) {
    const translations = await this.prisma.nodeTranslation.findMany({
      where: { node_id: nodeId },
      include: {
        translator: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        locale: 'asc',
      },
    });

    return translations;
  }

  /**
   * Get a specific node translation
   *
   * @param nodeId - Node ID
   * @param locale - Locale code
   * @returns Translation details
   */
  async getNodeTranslation(nodeId: string, locale: string) {
    const translation = await this.prisma.nodeTranslation.findUnique({
      where: {
        node_id_locale: {
          node_id: nodeId,
          locale,
        },
      },
      include: {
        translator: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
        node: {
          select: {
            id: true,
            key: true,
            story_id: true,
          },
        },
      },
    });

    if (!translation) {
      throw new NotFoundException('Translation not found');
    }

    return translation;
  }

  /**
   * Update a node translation
   *
   * @param userId - User ID (for authorization)
   * @param nodeId - Node ID
   * @param locale - Locale code
   * @param updateDto - Update data
   * @returns Updated translation
   */
  async updateNodeTranslation(
    userId: string,
    nodeId: string,
    locale: string,
    updateDto: UpdateNodeTranslationDto,
  ) {
    const translation = await this.prisma.nodeTranslation.findUnique({
      where: {
        node_id_locale: {
          node_id: nodeId,
          locale,
        },
      },
      include: {
        node: {
          include: {
            story: true,
          },
        },
      },
    });

    if (!translation) {
      throw new NotFoundException('Translation not found');
    }

    // Check authorization (story owner or translator)
    if (
      translation.node.story.created_by !== userId &&
      translation.translated_by !== userId
    ) {
      throw new ForbiddenException(
        'You can only edit translations for your own stories or translations you created',
      );
    }

    const updated = await this.prisma.nodeTranslation.update({
      where: {
        node_id_locale: {
          node_id: nodeId,
          locale,
        },
      },
      data: {
        ...(updateDto.textMd && { text_md: updateDto.textMd }),
        ...(updateDto.choicesLabels !== undefined && {
          choices_labels: updateDto.choicesLabels,
        }),
        ...(updateDto.translationStatus && {
          translation_status: updateDto.translationStatus,
        }),
      },
    });

    this.logger.log(`Node translation updated: ${updated.id}`);

    return updated;
  }

  /**
   * Delete a node translation
   *
   * @param userId - User ID (for authorization)
   * @param nodeId - Node ID
   * @param locale - Locale code
   */
  async deleteNodeTranslation(userId: string, nodeId: string, locale: string) {
    const translation = await this.prisma.nodeTranslation.findUnique({
      where: {
        node_id_locale: {
          node_id: nodeId,
          locale,
        },
      },
      include: {
        node: {
          include: {
            story: true,
          },
        },
      },
    });

    if (!translation) {
      throw new NotFoundException('Translation not found');
    }

    // Check authorization (story owner or translator)
    if (
      translation.node.story.created_by !== userId &&
      translation.translated_by !== userId
    ) {
      throw new ForbiddenException(
        'You can only delete translations for your own stories or translations you created',
      );
    }

    await this.prisma.nodeTranslation.delete({
      where: {
        node_id_locale: {
          node_id: nodeId,
          locale,
        },
      },
    });

    this.logger.log(`Node translation deleted: ${translation.id}`);

    return { message: 'Translation deleted successfully' };
  }

  /**
   * Get translation progress for a story
   * Shows completion status across all locales
   *
   * @param storyId - Story ID
   * @returns Translation progress statistics
   */
  async getStoryTranslationProgress(storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        nodes: true,
        translations: true,
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    const availableLocales = story.available_languages;
    const totalNodes = story.nodes.length;

    const progress = await Promise.all(
      availableLocales.map(async (locale) => {
        // Get story translation
        const storyTranslation = story.translations.find(
          (t) => t.locale === locale,
        );

        // Get node translations count
        const nodeTranslationsCount = await this.prisma.nodeTranslation.count({
          where: {
            locale,
            node: {
              story_id: storyId,
            },
          },
        });

        // Get completed node translations count
        const completedNodeTranslations =
          await this.prisma.nodeTranslation.count({
            where: {
              locale,
              translation_status: 'complete',
              node: {
                story_id: storyId,
              },
            },
          });

        return {
          locale,
          storyTranslation: {
            exists: !!storyTranslation,
            status: storyTranslation?.translation_status || null,
          },
          nodeTranslations: {
            total: nodeTranslationsCount,
            completed: completedNodeTranslations,
            percentage:
              totalNodes > 0
                ? Math.round((nodeTranslationsCount / totalNodes) * 100)
                : 0,
          },
        };
      }),
    );

    return {
      storyId,
      totalNodes,
      availableLocales,
      progress,
    };
  }
}
