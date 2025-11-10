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
      this.prisma.save.count(),
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
      include: {
        author: {
          select: {
            id: true,
            display_name: true,
          },
        },
        _count: {
          select: {
            saves: true,
          },
        },
      },
      orderBy: {
        saves: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return popularStories.map((story) => ({
      id: story.id,
      title: story.title,
      synopsis: story.synopsis,
      genre: story.genre,
      created_by: {
        id: story.author.id,
        display_name: story.author.display_name,
      },
      play_count: story._count.saves,
    }));
  }

  async getStoryStats(storyId: string) {
    const [story, playCount] = await Promise.all([
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
      this.prisma.save.count({
        where: { story_id: storyId },
      }),
    ]);

    return {
      story,
      stats: {
        total_plays: playCount,
        unique_players: playCount, // Each save represents a unique player session
      },
    };
  }

  async getActiveUsers(days: number = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activeUsers = await this.prisma.save.groupBy({
      by: ['user_id'],
      where: {
        created_at: {
          gte: since,
        },
      },
      _count: true,
    });

    return {
      period_days: days,
      active_users_count: activeUsers.length,
      total_sessions: activeUsers.reduce((sum, user) => sum + (typeof user._count === 'number' ? user._count : 0), 0),
    };
  }
}
