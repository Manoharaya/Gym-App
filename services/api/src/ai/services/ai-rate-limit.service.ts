import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AIRateLimitService {
  private readonly logger = new Logger(AIRateLimitService.name);
  private readonly memoryBuckets = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly redis: RedisService) {}

  /**
   * Enforces requests per minute limit per user.
   */
  async assertRateLimit(userId: string, maxRequestsPerMinute: number = 60): Promise<void> {
    const key = `ratelimit:ai:${userId}`;
    const now = Date.now();

    // Check Redis or in-memory fallback
    const currentCountStr = await this.redis.get(key);

    if (currentCountStr) {
      const count = parseInt(currentCountStr, 10);
      if (count >= maxRequestsPerMinute) {
        this.logger.warn(`AI Rate limit hit for user '${userId}' (${count}/${maxRequestsPerMinute} per min)`);
        throw new HttpException(
          'AI rate limit exceeded. Please wait a moment before sending more requests.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      await this.redis.set(key, String(count + 1), 60);
    } else {
      // First request in window
      await this.redis.set(key, '1', 60);
    }
  }
}
