import { Request, Response, NextFunction } from 'express';

export const INTERNAL_HEADER = 'x-ens-internal';

export function blockRecursiveCalls(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.get(INTERNAL_HEADER)) {
    console.warn('Recursive call detected via internal header');
    res.status(403).json({ message: 'Recursive calls are not allowed.' });
    return;
  }

  const requestOrigin = req.get('origin') || req.get('referer');

  if (requestOrigin) {
    try {
      const parsedRequestOrigin = new URL(requestOrigin);

      if (
        parsedRequestOrigin.hostname === req.hostname &&
        parsedRequestOrigin.protocol.includes('http')
      ) {
        console.warn('Recursive call detected via Origin/Referer');
        res.status(403).json({ message: 'Recursive calls are not allowed.' });
        return;
      }
    } catch (error) {
      console.warn('Error parsing URL', error);
    }
  }
  next();
}
