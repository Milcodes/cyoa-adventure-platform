import { Module } from '@nestjs/common';
import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';

/**
 * TranslationModule
 *
 * Provides REST API endpoints for translation management.
 * Allows authors to manage multi-language support for their stories.
 */
@Module({
  controllers: [TranslationController],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}
