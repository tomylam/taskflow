import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { uploadFileToDrive } from '../lib/drive';

const router = Router();

const tmpDir = path.join(__dirname, '../../uploads/tmp');
fs.mkdirSync(tmpDir, { recursive: true });

// 100 MB limit
const upload = multer({ dest: tmpDir, limits: { fileSize: 100 * 1024 * 1024 } });

function safeDeleteLocal(filePath: string) {
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
}

// ─── LIST tasks ──────────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { status, type } = req.query;
  const tasks = await prisma.task.findMany({
    where: {
      ...(status ? { status: String(status) } : {}),
      ...(type ? { taskType: String(type) } : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      files: true,
      quotes: { include: { provider: { select: { id: true, name: true } } } },
      stages: { orderBy: { order: 'asc' } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tasks);
});

// GET /api/tasks/unseen-count
router.get('/unseen-count', requireAuth, requireRole('DISTRIBUTOR'), async (_req: AuthRequest, res: Response) => {
  const count = await prisma.task.count({ where: { seenByDistributor: false } });
  res.json({ count });
});

// GET /api/tasks/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      files: { include: { uploadedBy: { select: { id: true, name: true } } } },
      quotes: { include: { provider: { select: { id: true, name: true } } } },
      revisions: { orderBy: { round: 'asc' } },
      stages: { orderBy: { order: 'asc' } },
      messages: {
        include: { sender: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  // Mark as seen when distributor opens the task
  if (req.user?.role === 'DISTRIBUTOR' && !task.seenByDistributor) {
    await prisma.task.update({ where: { id: req.params.id }, data: { seenByDistributor: true } });
  }

  res.json(task);
});

// ─── CREATE task (Distributor only) ─────────────────────────────────────────

router.post(
  '/',
  requireAuth,
  requireRole('DISTRIBUTOR'),
  upload.array('files', 20),
  async (req: AuthRequest, res: Response) => {
    const { title, rawPrompt, taskType, wordCount, deadline, university, stages } = req.body;
    const localFiles = (req.files as Express.Multer.File[]) || [];

    const stagesArr: string[] = stages
      ? (Array.isArray(stages) ? stages : JSON.parse(String(stages)))
      : [];

    const task = await prisma.task.create({
      data: {
        title: String(title),
        rawPrompt: rawPrompt ? String(rawPrompt) : undefined,
        taskType: taskType || 'MIXED',
        wordCount: wordCount ? Number(wordCount) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        university: university || undefined,
        status: 'PENDING_QUOTE',
        seenByDistributor: true,
        createdById: req.user!.userId,
        stages: stagesArr.length
          ? {
              create: stagesArr.map((name: string, idx: number) => ({
                name,
                order: idx + 1,
                status: 'PENDING',
              })),
            }
          : undefined,
      },
      include: { stages: true },
    });

    // Upload files to Storj — each task gets its own yyyymmdd-TaskName subfolder
    const uploadedFiles = [];
    for (const file of localFiles) {
      try {
        const buffer = fs.readFileSync(file.path);
        const { fileId, webViewLink } = await uploadFileToDrive({
          fileName:      file.originalname,
          mimeType:      file.mimetype,
          buffer,
          taskId:        task.id,
          taskTitle:     task.title,
          taskCreatedAt: task.createdAt,
          fileCategory:  'Materials',
        });
        const taskFile = await prisma.taskFile.create({
          data: {
            taskId: task.id,
            driveFileId: fileId,
            driveUrl: webViewLink,
            fileName: file.originalname,
            mimeType: file.mimetype,
            uploadedById: req.user!.userId,
          },
        });
        uploadedFiles.push(taskFile);
      } catch (err) {
        console.error(`Upload failed for ${file.originalname}:`, err);
      } finally {
        safeDeleteLocal(file.path);
      }
    }

    res.status(201).json({ ...task, files: uploadedFiles });
  }
);

// ─── DELETE task ─────────────────────────────────────────────────────────────

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  if (req.user!.role === 'PROVIDER') {
    const hasQuote = await prisma.quote.findFirst({
      where: { taskId: req.params.id, providerId: req.user!.userId },
    });
    if (!hasQuote && task.status !== 'PENDING_QUOTE') {
      res.status(403).json({ error: 'Providers can only delete tasks they have quoted on' });
      return;
    }
  }

  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ─── UPDATE task status ──────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING_QUOTE: ['QUOTED'],
  QUOTED: ['IN_PROGRESS', 'PENDING_QUOTE'],
  IN_PROGRESS: ['SUBMITTED'],
  SUBMITTED: ['REVISION', 'COMPLETED'],
  REVISION: ['SUBMITTED'],
};

router.patch('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  const { status, feedback } = req.body;
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  const allowed = VALID_TRANSITIONS[task.status] ?? [];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: `Cannot transition from ${task.status} to ${status}` });
    return;
  }

  const updateData: Record<string, unknown> = { status };

  if (status === 'REVISION') {
    const round = task.revisionRound + 1;
    updateData.revisionRound = round;
    await prisma.revision.create({
      data: { taskId: task.id, round, feedback: feedback || '' },
    });
  }

  // Provider actions → notify distributor
  if (req.user?.role === 'PROVIDER' && (status === 'SUBMITTED' || status === 'QUOTED')) {
    updateData.seenByDistributor = false;
  }

  const updated = await prisma.task.update({ where: { id: req.params.id }, data: updateData });
  res.json(updated);
});

// ─── Mark seen ───────────────────────────────────────────────────────────────

router.patch('/:id/seen', requireAuth, requireRole('DISTRIBUTOR'), async (req: AuthRequest, res: Response) => {
  const updated = await prisma.task.update({
    where: { id: req.params.id },
    data: { seenByDistributor: true },
  });
  res.json(updated);
});

// ─── Upload files (Materials) ────────────────────────────────────────────────

router.post(
  '/:id/files',
  requireAuth,
  upload.array('files', 10),
  async (req: AuthRequest, res: Response) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

    const localFiles = (req.files as Express.Multer.File[]) || [];
    const stageName = req.body.stageName ? String(req.body.stageName) : undefined;
    const results = [];

    for (const file of localFiles) {
      try {
        const buffer = fs.readFileSync(file.path);
        const { fileId, webViewLink } = await uploadFileToDrive({
          fileName:      file.originalname,
          mimeType:      file.mimetype,
          buffer,
          taskId:        task.id,
          taskTitle:     task.title,
          taskCreatedAt: task.createdAt,
          fileCategory:  'Materials',
        });
        const taskFile = await prisma.taskFile.create({
          data: {
            taskId: task.id,
            driveFileId: fileId,
            driveUrl: webViewLink,
            fileName: file.originalname,
            mimeType: file.mimetype,
            stageName,
            uploadedById: req.user!.userId,
          },
        });
        results.push(taskFile);
      } catch (err) {
        console.error(`Upload failed for ${file.originalname}:`, err);
      } finally {
        safeDeleteLocal(file.path);
      }
    }

    // Provider uploading files → notify distributor
    if (req.user?.role === 'PROVIDER') {
      await prisma.task.update({ where: { id: task.id }, data: { seenByDistributor: false } });
    }

    res.status(201).json(results);
  }
);

// ─── Submit work (Provider) — upload files then advance status ────────────────
// POST /:id/submit
// Requires at least one file. Uploads to "Submitted Work/v<n>" then sets SUBMITTED.

router.post(
  '/:id/submit',
  requireAuth,
  requireRole('PROVIDER'),
  upload.array('files', 20),
  async (req: AuthRequest, res: Response) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

    if (task.status !== 'IN_PROGRESS' && task.status !== 'REVISION') {
      res.status(400).json({ error: 'Task is not in a submittable state' });
      return;
    }

    const localFiles = (req.files as Express.Multer.File[]) || [];
    if (localFiles.length === 0) {
      res.status(400).json({ error: 'At least one file is required to submit work' });
      return;
    }

    // Version = current revisionRound + 1 (first submit = v1, after revision = v2, …)
    const version = task.revisionRound + 1;
    const category = `Submitted Work/v${version}`;
    const uploadedFiles = [];

    for (const file of localFiles) {
      try {
        const buffer = fs.readFileSync(file.path);
        const { fileId, webViewLink } = await uploadFileToDrive({
          fileName:      file.originalname,
          mimeType:      file.mimetype,
          buffer,
          taskId:        task.id,
          taskTitle:     task.title,
          taskCreatedAt: task.createdAt,
          fileCategory:  category,
        });
        const taskFile = await prisma.taskFile.create({
          data: {
            taskId:       task.id,
            driveFileId:  fileId,
            driveUrl:     webViewLink,
            fileName:     file.originalname,
            mimeType:     file.mimetype,
            stageName:    category,   // reuse stageName column to record the version
            uploadedById: req.user!.userId,
          },
        });
        uploadedFiles.push(taskFile);
      } catch (err) {
        console.error(`Submit upload failed for ${file.originalname}:`, err);
      } finally {
        safeDeleteLocal(file.path);
      }
    }

    if (uploadedFiles.length === 0) {
      res.status(500).json({ error: 'All file uploads failed. Please try again.' });
      return;
    }

    // Advance task status → SUBMITTED and notify distributor
    const updated = await prisma.task.update({
      where: { id: task.id },
      data:  { status: 'SUBMITTED', seenByDistributor: false },
    });

    res.status(201).json({ task: updated, files: uploadedFiles });
  }
);

// ─── Stages ──────────────────────────────────────────────────────────────────

router.patch('/:id/stages/:stageId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const stage = await prisma.taskStage.update({
    where: { id: req.params.stageId },
    data: { status },
  });
  res.json(stage);
});

export default router;
