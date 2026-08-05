import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/expenses
 * Returns monthly expense totals derived from accepted quotes.
 * Query params:
 *   year  — filter to a specific year (optional, defaults to current year)
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

  // Fetch all accepted quotes with their task creation date
  const accepted = await prisma.quote.findMany({
    where: { status: 'ACCEPTED' },
    include: {
      task: { select: { id: true, title: true, taskType: true, university: true, createdAt: true } },
      provider: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by year-month
  const monthMap: Record<string, {
    year: number;
    month: number;
    label: string;
    total: number;
    currency: string;
    count: number;
    entries: Array<{ taskId: string; taskTitle: string; providerName: string; amount: number; currency: string; taskType: string }>;
  }> = {};

  for (const q of accepted) {
    const d = new Date(q.createdAt);
    if (d.getFullYear() !== year) continue;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) {
      monthMap[key] = {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString('en', { month: 'long', year: 'numeric' }),
        total: 0,
        currency: q.currency,
        count: 0,
        entries: [],
      };
    }
    monthMap[key].total += q.amount;
    monthMap[key].count += 1;
    monthMap[key].entries.push({
      taskId: q.task.id,
      taskTitle: q.task.title,
      providerName: q.provider.name,
      amount: q.amount,
      currency: q.currency,
      taskType: q.task.taskType,
    });
  }

  const months = Object.values(monthMap).sort((a, b) => a.month - b.month);

  // Also return available years for the year selector
  const allYears = [...new Set(
    accepted.map((q) => new Date(q.createdAt).getFullYear())
  )].sort();
  if (!allYears.includes(new Date().getFullYear())) {
    allYears.push(new Date().getFullYear());
  }

  res.json({ year, months, availableYears: allYears.sort() });
});

export default router;
