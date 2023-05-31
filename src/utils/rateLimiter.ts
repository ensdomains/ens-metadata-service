import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { REDIS_URL } from '../config';

let rateLimiter: RateLimiterRedis | null = null;

if (REDIS_URL) {
  const redisClient = new Redis({
    port: 6379,
    host: REDIS_URL,
    enableOfflineQueue: false 
  });

  redisClient.on('error', (error: any) => {
    console.warn('redis error', error);
  });

  const opts = {
    storeClient: redisClient,
    points: 100,  // Number of total points
    duration: 5,  // Per second(s)
    execEvenly: false,  // Do not delay actions evenly
    blockDuration: 0,   // Do not block the caller if consumed more than points
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
    return next();
  }

  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
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
