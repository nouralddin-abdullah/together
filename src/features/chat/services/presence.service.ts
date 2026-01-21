import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class PresenceService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  private readonly PRESENCE_PREFIX = 'presence:team:';
  private readonly TYPING_PREFIX = 'typing:user:';
  private readonly SOCKET_PREFIX = 'socket:user:';
  private readonly TYPING_EXPIRY_SECONDS = 3;

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');

    this.redis = new Redis({
      host,
      port,
      password: password || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redis.on('connect', () => {
      console.log('🔌 Presence Service: Connected to Redis');
    });

    this.redis.on('error', (err) => {
      console.error('❌ Presence Service: Redis error:', err.message);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit();
  }

  // ─── Online Presence ───────────────────────────────────────────────────────

  async addUserToTeam(userId: string, teamId: string): Promise<void> {
    await this.redis.sadd(`${this.PRESENCE_PREFIX}${teamId}`, userId);
  }

  async removeUserFromTeam(userId: string, teamId: string): Promise<void> {
    await this.redis.srem(`${this.PRESENCE_PREFIX}${teamId}`, userId);
    await this.setTyping(userId, teamId, false);
  }

  async getOnlineUsers(teamId: string): Promise<string[]> {
    return this.redis.smembers(`${this.PRESENCE_PREFIX}${teamId}`);
  }

  async isUserOnline(userId: string, teamId: string): Promise<boolean> {
    const result = await this.redis.sismember(
      `${this.PRESENCE_PREFIX}${teamId}`,
      userId,
    );
    return result === 1;
  }

  // ─── Typing Indicators ─────────────────────────────────────────────────────

  async setTyping(
    userId: string,
    teamId: string,
    isTyping: boolean,
  ): Promise<void> {
    const key = `${this.TYPING_PREFIX}${userId}:team:${teamId}`;

    if (isTyping) {
      await this.redis.setex(key, this.TYPING_EXPIRY_SECONDS, '1');
    } else {
      await this.redis.del(key);
    }
  }

  async getTypingUsers(teamId: string): Promise<string[]> {
    const pattern = `${this.TYPING_PREFIX}*:team:${teamId}`;
    const keys = await this.redis.keys(pattern);

    return keys
      .map((key) => {
        const match = key.match(/typing:user:([^:]+):team:/);
        return match ? match[1] : '';
      })
      .filter(Boolean);
  }

  // ─── Socket Mapping ────────────────────────────────────────────────────────

  async setUserSocket(userId: string, socketId: string): Promise<void> {
    await this.redis.set(`${this.SOCKET_PREFIX}${userId}`, socketId);
  }

  async getUserSocket(userId: string): Promise<string | null> {
    return this.redis.get(`${this.SOCKET_PREFIX}${userId}`);
  }

  async removeUserSocket(userId: string): Promise<void> {
    await this.redis.del(`${this.SOCKET_PREFIX}${userId}`);
  }
}
