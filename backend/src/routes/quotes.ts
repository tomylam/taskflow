import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

const QuoteSchema = z.object({
  taskId: z.string(),
  amount: z.number().positive(),
  currency: z.string().optional(),
  note: z.string().optional(),
});

// POST /api/quotes
router.post('/', requireAuth, requireRole('PROVIDER'), async (req: AuthRequest, res: Response) => {
  const body = QuoteSchema.parse(req.body);

  const task = await prisma.task.findUnique({ where: { id: body.taskId } });
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
  if (task.status !== 'PENDING_QUOTE') {
    res.status(400).json({ error: 'Task is not accepting quotes' });
    return;
  }

  // Check if this provider already quoted (excluding rejected ones)
  const existing = await prisma.quote.findFirst({
    where: {
      taskId: body.taskId,
      providerId: req.user!.userId,
      status: { not: 'REJECTED' },
    },
  });
  if (existing) {
    res.status(409).json({ error: 'You have already quoted this task' });
    return;
  }

  const quote = await prisma.quote.create({
    data: {
      taskId: body.taskId,
      providerId: req.user!.userId,
      amount: body.amount,
      currency: body.currency || 'USD',
      note: body.note,
    },
  });

  // Move task to QUOTED and flag as unseen so distributor gets the red dot
  await prisma.task.update({
    where: { id: body.taskId },
    data: { status: 'QUOTED', seenByDistributor: false },
  });

  res.status(201).json(quote);
});

// PATCH /api/quotes/:id  — distributor accepts or rejects
router.patch('/:id', requireAuth, requireRole('DISTRIBUTOR'), async (req: AuthRequest, res: Response) => {
  const { status } = req.body as { status: 'ACCEPTED' | 'REJECTED' };
  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    res.status(400).json({ error: 'status must be ACCEPTED or REJECTED' });
    return;
  }

  const quote = await prisma.quote.update({ where: { id: req.params.id }, data: { status } });

  if (status === 'ACCEPTED') {
    // Reject all other quotes for this task
    await prisma.quote.updateMany({
      where: { taskId: quote.taskId, id: { not: quote.id } },
      data: { status: 'REJECTED' },
    });
    // Advance task to IN_PROGRESS
    await prisma.task.update({ where: { id: quote.taskId }, data: { status: 'IN_PROGRESS' } });
  } else {
    // If all quotes rejected, revert to PENDING_QUOTE
    const remaining = await prisma.quote.count({
      where: { taskId: quote.taskId, status: 'PENDING' },
    });
    if (remaining === 0) {
      await prisma.task.update({ where: { id: quote.taskId }, data: { status: 'PENDING_QUOTE' } });
    }
  }

  res.json(quote);
});

export default router;
