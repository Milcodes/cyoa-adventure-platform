import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSystemOverview() {
    const [
      totalUsers,
      totalStories,
      totalGameSaves,
      recentUsers,
      recentStories,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.story.count(),
      this.prisma.gameSave.count(),
      this.prisma.user.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      this.prisma.story.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const usersByRole = await this.prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    const storiesByStatus = await this.prisma.story.groupBy({
      by: ['status'],
      _count: true,
    });

    return {
      users: {
        total: totalUsers,
        recent: recentUsers,
        byRole: usersByRole.reduce((acc, curr) => {
          acc[curr.role] = curr._count;
          return acc;
        }, {} as Record<string, number>),
      },
      stories: {
        total: totalStories,
        recent: recentStories,
        byStatus: storiesByStatus.reduce((acc, curr) => {
          acc[curr.status] = curr._count;
          return acc;
        }, {} as Record<string, number>),
      },
      gameplay: {
        totalSaves: totalGameSaves,
      },
    };
  }

  async getPopularStories(limit: number = 10) {
    // Get stories with most game saves (indicating popularity)
    const popularStories = await this.prisma.story.findMany({
      where: { status: 'published' },
      select: {
        id: true,
        title: true,
        description: true,
        genre: true,
        created_by: {
          select: {
            id: true,
            display_name: true,
          },
        },
        _count: {
          select: {
            game_saves: true,
          },
        },
      },
      orderBy: {
        game_saves: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return popularStories.map((story) => ({
      ...story,
      play_count: story._count.game_saves,
      _count: undefined,
    }));
  }

  async getStoryStats(storyId: string) {
    const [story, playCount, completedCount, avgPlaytime] = await Promise.all([
      this.prisma.story.findUnique({
        where: { id: storyId },
        select: {
          id: true,
          title: true,
          genre: true,
          status: true,
          created_at: true,
        },
      }),
      this.prisma.gameSave.count({
        where: { story_id: storyId },
      }),
      this.prisma.gameSave.count({
        where: {
          story_id: storyId,
          status: 'completed',
        },
      }),
      this.prisma.gameSave.aggregate({
        where: { story_id: storyId },
        _avg: {
          total_play_time_seconds: true,
        },
      }),
    ]);

    return {
      story,
      stats: {
        total_plays: playCount,
        completed_plays: completedCount,
        completion_rate: playCount > 0 ? (completedCount / playCount) * 100 : 0,
        avg_playtime_minutes: avgPlaytime._avg.total_play_time_seconds
          ? Math.round(avgPlaytime._avg.total_play_time_seconds / 60)
          : 0,
      },
    };
  }

  async getActiveUsers(days: number = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activeUsers = await this.prisma.gameSave.groupBy({
      by: ['player_id'],
      where: {
        updated_at: {
          gte: since,
        },
      },
      _count: true,
    });

    return {
      period_days: days,
      active_users_count: activeUsers.length,
      total_sessions: activeUsers.reduce((sum, user) => sum + user._count, 0),
    };
  }
}
