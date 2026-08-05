import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import quoteRoutes from './routes/quotes';
import messageRoutes from './routes/messages';
import expenseRoutes from './routes/expenses';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/tasks', messageRoutes);
app.use('/api/expenses', expenseRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});

export default app;
