import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  constructor(private readonly redis: RedisService) {}

  async checkLimit(key: string, maxAttempts = 5, windowSeconds = 900): Promise<void> {
    const redisKey = `ratelimit:${key}`;
    const rawCount = await this.redis.get(redisKey);
    const count = rawCount ? parseInt(rawCount, 10) : 0;

    if (count >= maxAttempts) {
      this.logger.warn(`Rate limit exceeded for key: ${key} (${count}/${maxAttempts})`);
      throw new HttpException(
        'Too many failed login attempts. Account temporarily locked. Please try again in 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async recordFailedAttempt(key: string, windowSeconds = 900): Promise<number> {
    const redisKey = `ratelimit:${key}`;
    const rawCount = await this.redis.get(redisKey);
    const count = (rawCount ? parseInt(rawCount, 10) : 0) + 1;

    await this.redis.set(redisKey, count.toString(), windowSeconds);
    return count;
  }

  async reset(key: string): Promise<void> {
    const redisKey = `ratelimit:${key}`;
    await this.redis.del(redisKey);
  }
}
