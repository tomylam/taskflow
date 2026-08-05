import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';

const router = Router();

const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['DISTRIBUTOR', 'PROVIDER']),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const body = RegisterSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: { name: body.name, email: body.email, passwordHash, role: body.role },
  });
  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const body = LoginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const token = signToken({ userId: user.id, role: user.role });
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
});

export default router;
