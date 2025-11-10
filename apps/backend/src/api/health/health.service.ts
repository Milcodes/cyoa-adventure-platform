import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkMemory(),
    ]);

    const dbCheck = checks[0];
    const memCheck = checks[1];

    const isHealthy =
      dbCheck.status === 'fulfilled' &&
      memCheck.status === 'fulfilled';

    if (!isHealthy) {
      throw new HttpException(
        {
          status: 'error',
          timestamp: new Date().toISOString(),
          checks: {
            database: dbCheck.status === 'fulfilled' ? 'ok' : 'error',
            memory: memCheck.status === 'fulfilled' ? 'ok' : 'error',
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        memory: 'ok',
      },
    };
  }

  async readiness() {
    try {
      await this.checkDatabase();
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          reason: 'Database connection failed',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async checkDatabase() {
    // Simple query to check if database is accessible
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async checkMemory() {
    const used = process.memoryUsage();
    const threshold = 0.9; // 90% memory usage threshold

    // Check if heap usage is below threshold
    const heapUsedPercent = used.heapUsed / used.heapTotal;

    if (heapUsedPercent > threshold) {
      throw new Error('Memory usage too high');
    }

    return {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(used.heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(used.rss / 1024 / 1024) + ' MB',
    };
  }
}
