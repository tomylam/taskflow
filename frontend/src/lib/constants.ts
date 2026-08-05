import { TaskStatus, TaskType } from '../types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING_QUOTE: 'Pending Quote',
  QUOTED: 'Quoted',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  REVISION: 'Revision',
  COMPLETED: 'Completed',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING_QUOTE: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300',
  QUOTED:        'bg-sky-100 text-sky-800 ring-1 ring-sky-300',
  IN_PROGRESS:   'bg-brand-100 text-brand-800 ring-1 ring-brand-300',
  SUBMITTED:     'bg-purple-100 text-purple-800 ring-1 ring-purple-300',
  REVISION:      'bg-rose-100 text-rose-800 ring-1 ring-rose-300',
  COMPLETED:     'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
};

export const TYPE_LABELS: Record<TaskType, string> = {
  ESSAY:          'Essay',
  POWERPOINT:     'PowerPoint',
  SPSS:           'SPSS',
  QUESTIONNAIRE:  'Questionnaire',
  LONG_TERM:      'Long-Term',
  MIXED:          'Mixed',
};

export const TYPE_COLORS: Record<TaskType, string> = {
  ESSAY:         'bg-sky-100 text-sky-800 ring-1 ring-sky-200',
  POWERPOINT:    'bg-rose-100 text-rose-800 ring-1 ring-rose-200',
  SPSS:          'bg-violet-100 text-violet-800 ring-1 ring-violet-200',
  QUESTIONNAIRE: 'bg-teal-100 text-teal-800 ring-1 ring-teal-200',
  LONG_TERM:     'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  MIXED:         'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
};
