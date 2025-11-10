import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get system overview statistics' })
  @ApiResponse({ status: 200, description: 'System stats retrieved' })
  async getSystemOverview() {
    return this.analyticsService.getSystemOverview();
  }

  @Get('stories/popular')
  @ApiOperation({ summary: 'Get most popular stories' })
  @ApiResponse({ status: 200, description: 'Popular stories list' })
  async getPopularStories(@Query('limit') limit?: string) {
    return this.analyticsService.getPopularStories(parseInt(limit || '10'));
  }

  @Get('stories/:storyId/stats')
  @Roles(UserRole.author, UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get specific story statistics' })
  @ApiResponse({ status: 200, description: 'Story stats retrieved' })
  async getStoryStats(@Query('storyId') storyId: string) {
    return this.analyticsService.getStoryStats(storyId);
  }

  @Get('users/active')
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get active users count' })
  @ApiResponse({ status: 200, description: 'Active users count' })
  async getActiveUsers(@Query('days') days?: string) {
    return this.analyticsService.getActiveUsers(parseInt(days || '7'));
  }
}
