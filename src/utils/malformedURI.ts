import { Request, Response, NextFunction } from 'express';

export function malformedURIMiddleware(
  err: Error,
  _: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof URIError) {
    console.error('Malformed URI:', err.message);
    res.status(400).send({ error: `Malformed URI`, message: err.message });
  } else {
    next(err);
  }
}
