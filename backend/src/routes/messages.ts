import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/tasks/:taskId/messages
router.get('/:taskId/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  const messages = await prisma.message.findMany({
    where: { taskId: req.params.taskId },
    include: { sender: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(messages);
});

// POST /api/tasks/:taskId/messages
router.post('/:taskId/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  const { body: msgBody } = req.body as { body: string };
  if (!msgBody?.trim()) { res.status(400).json({ error: 'Message body required' }); return; }

  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  const message = await prisma.message.create({
    data: {
      taskId: req.params.taskId,
      senderId: req.user!.userId,
      body: msgBody.trim(),
    },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  // Provider sends a message → distributor hasn't seen it yet
  if (req.user!.role === 'PROVIDER') {
    await prisma.task.update({
      where: { id: req.params.taskId },
      data: { seenByDistributor: false },
    });
  }

  res.status(201).json(message);
});

export default router;
