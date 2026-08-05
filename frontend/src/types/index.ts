export type UserRole = 'DISTRIBUTOR' | 'PROVIDER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type TaskStatus =
  | 'PENDING_QUOTE'
  | 'QUOTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'REVISION'
  | 'COMPLETED';

export type TaskType = 'ESSAY' | 'POWERPOINT' | 'SPSS' | 'QUESTIONNAIRE' | 'LONG_TERM' | 'MIXED';

export interface TaskFile {
  id: string;
  taskId: string;
  driveFileId: string;
  driveUrl: string;
  fileName: string;
  mimeType: string;
  stageName: string | null;
  uploadedAt: string;
  uploadedBy: { id: string; name: string };
}

export interface Quote {
  id: string;
  taskId: string;
  providerId: string;
  amount: number;
  currency: string;
  note: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  provider: { id: string; name: string };
}

export interface TaskStage {
  id: string;
  taskId: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED';
  dueDate: string | null;
  order: number;
}

export interface Revision {
  id: string;
  taskId: string;
  round: number;
  feedback: string;
  requestedAt: string;
}

export interface Message {
  id: string;
  taskId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role: UserRole };
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  taskType: TaskType;
  wordCount: number | null;
  deadline: string | null;
  university: string | null;
  aiDescription: string | null;
  rawPrompt: string | null;
  revisionRound: number;
  seenByDistributor: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string; email: string };
  files: TaskFile[];
  quotes: Quote[];
  revisions: Revision[];
  stages: TaskStage[];
  messages: Message[];
  _count?: { messages: number };
}

export interface MonthlyExpense {
  year: number;
  month: number;
  label: string;
  total: number;
  currency: string;
  count: number;
  entries: Array<{
    taskId: string;
    taskTitle: string;
    providerName: string;
    amount: number;
    currency: string;
    taskType: string;
  }>;
}
