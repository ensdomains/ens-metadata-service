import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { REDIS_URL } from '../config';

let rateLimiter: RateLimiterRedis | null = null;
let redisClient: Redis | null = null;

if (REDIS_URL) {
  redisClient = new Redis({
    port: 6379,
    host: REDIS_URL,
    enableOfflineQueue: false,
  });

  redisClient.on('error', (error: any) => {
    console.warn('redis error', error);
  });

  const opts = {
    storeClient: redisClient,
    points: 40, // Number of total points
    duration: 2, // Per second(s)
    execEvenly: false, // Do not delay actions evenly
    blockDuration: 0, // Do not block the caller if consumed more than points
    keyPrefix: 'ensrl', // Assign unique keys for each limiters with different purposes
  };

  rateLimiter = new RateLimiterRedis(opts);
}

export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!rateLimiter) {
    console.warn('Rate limiter not ready, skipping...');
    return next();
  }

  if (redisClient?.status !== 'ready') {
    console.warn('Redis client not ready, skipping...');
    return next();
  }

  // using Cloudflare's CF-Connecting-IP for clarity instead of X-Forwarded-For, which can be spooofed if not behind CF.
  // Falls back to socket remote address if not behind CF
  const clientIP = req.headers['cf-connecting-ip'] || req.socket.remoteAddress;
  try {
    await rateLimiter.consume(clientIP as string);
    next();
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      res.status(429).json({
        message:
          'Too many requests from this source, please decrease your request rate.',
      });
    } else {
      console.error('An unexpected error occurred:', error);
      next(error);
    }
  }
}
