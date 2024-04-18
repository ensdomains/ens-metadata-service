import { Request, Response, NextFunction } from 'express';

export function blockRecursiveCalls(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestOrigin = req.get('origin') || req.get('referer');

  if (requestOrigin) {
    try {
      const parsedRequestOrigin = new URL(requestOrigin);

      if (
        parsedRequestOrigin.hostname === req.hostname &&
        parsedRequestOrigin.protocol.includes('http')
      ) {
        console.warn(`Recursive call detected`);
        res.status(403).json({ message: 'Recursive calls are not allowed.' });
        return;
      }
    } catch (error) {
      console.warn('Error parsing URL', error);
    }
  }
  next();
}
