import { Router } from 'express';
import { z } from 'zod';
import { extractLinks } from '../../shared/utils/parser';
import { AppError } from '../../shared/errors/errors';
import { messageQueue } from '../../worker/queue';

export const queueRouter = Router();

const EnqueueBody = z.object({
  text: z.string().min(1),
  source: z.string().default('api'),
});

queueRouter.post('/enqueue', async (req, res, next) => {
  try {
    const body = EnqueueBody.parse(req.body);
    const links = extractLinks(body.text);
    if (links.length === 0) {
      throw new AppError('ValidationError', 'No valid torrent or magnet links found', 400);
    }
    await messageQueue.add('message', { text: body.text, links, source: body.source });
    res.status(202).json({ accepted: links.length });
  } catch (err) {
    next(err);
  }
});

