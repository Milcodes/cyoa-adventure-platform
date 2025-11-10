import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { GameplayService } from './gameplay.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { StartGameDto } from './dto/start-game.dto';
import { MakeChoiceDto } from './dto/make-choice.dto';

/**
 * GameplayController
 *
 * REST endpoints for CYOA gameplay:
 * - Start new games
 * - Load/save game states
 * - Make choices
 * - View progress
 */
@Controller('gameplay')
@UseGuards(JwtAuthGuard)
export class GameplayController {
  constructor(private readonly gameplayService: GameplayService) {}

  /**
   * POST /v1/gameplay/start
   * Start a new game
   */
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  async startGame(
    @GetUser('id') userId: string,
    @Body() startGameDto: StartGameDto,
  ) {
    return await this.gameplayService.startGame(userId, startGameDto);
  }

  /**
   * GET /v1/gameplay/saves
   * List all saves for the current user
   */
  @Get('saves')
  async listSaves(
    @GetUser('id') userId: string,
    @Query('storyId') storyId?: string,
  ) {
    return await this.gameplayService.listSaves(userId, storyId);
  }

  /**
   * GET /v1/gameplay/state/:saveId
   * Load a game state
   */
  @Get('state/:saveId')
  async loadGame(
    @GetUser('id') userId: string,
    @Param('saveId') saveId: string,
    @Query('locale') locale: string = 'hu',
  ) {
    return await this.gameplayService.loadGame(userId, saveId, locale);
  }

  /**
   * POST /v1/gameplay/choice
   * Make a choice and advance the game
   */
  @Post('choice')
  @HttpCode(HttpStatus.OK)
  async makeChoice(
    @GetUser('id') userId: string,
    @Body() makeChoiceDto: MakeChoiceDto,
  ) {
    return await this.gameplayService.makeChoice(userId, makeChoiceDto);
  }

  /**
   * GET /v1/gameplay/node/:nodeId
   * Get node content (for preview)
   */
  @Get('node/:nodeId')
  async getNodeContent(
    @Param('nodeId') nodeId: string,
    @Query('locale') locale: string = 'hu',
  ) {
    return await this.gameplayService.getNodeContent(nodeId, locale);
  }

  /**
   * GET /v1/gameplay/progress/:saveId
   * Get progress statistics
   */
  @Get('progress/:saveId')
  async getProgress(
    @GetUser('id') userId: string,
    @Param('saveId') saveId: string,
  ) {
    return await this.gameplayService.getProgress(userId, saveId);
  }

  /**
   * DELETE /v1/gameplay/save/:saveId
   * Delete a save
   */
  @Delete('save/:saveId')
  @HttpCode(HttpStatus.OK)
  async deleteSave(
    @GetUser('id') userId: string,
    @Param('saveId') saveId: string,
  ) {
    return await this.gameplayService.deleteSave(userId, saveId);
  }
}
