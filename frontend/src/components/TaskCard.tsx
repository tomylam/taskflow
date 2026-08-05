import React from 'react';
import { Task } from '../types';
import { STATUS_LABELS, STATUS_COLORS, TYPE_LABELS, TYPE_COLORS } from '../lib/constants';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, FileText, MessageCircle, DollarSign, Building, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface Props {
  task: Task;
}

export default function TaskCard({ task }: Props) {
  const { isDistributor } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isOverdue =
    task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== 'COMPLETED';

  // Red dot: show to distributor when provider has made an update
  const hasNewUpdate = isDistributor && !task.seenByDistributor;

  const deleteMutation = useMutation({
    mutationFn: async () => { await api.delete(`/tasks/${task.id}`); },
    onSuccess: () => {
      toast.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast.error('Could not delete task'),
  });

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault(); // don't navigate to detail
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    deleteMutation.mutate();
  }

  return (
    <Link to={`/tasks/${task.id}`} className="card p-5 hover:shadow-md transition-shadow block relative">
      {/* Red dot notification for distributor */}
      {hasNewUpdate && (
        <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" title="New update" />
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-gray-900 leading-snug pr-4">{task.title}</h3>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`badge ${STATUS_COLORS[task.status]}`}>
            {STATUS_LABELS[task.status]}
          </span>
          <span className={`badge ${TYPE_COLORS[task.taskType]}`}>
            {TYPE_LABELS[task.taskType]}
          </span>
        </div>
      </div>

      {task.aiDescription && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{task.aiDescription}</p>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {task.university && (
          <span className="flex items-center gap-1">
            <Building size={12} />
            {task.university}
          </span>
        )}
        {task.wordCount && (
          <span className="flex items-center gap-1">
            <FileText size={12} />
            {task.wordCount.toLocaleString()} words
          </span>
        )}
        {task.deadline && (
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
            <Calendar size={12} />
            {format(new Date(task.deadline), 'dd MMM yyyy')}
            {isOverdue && ' (overdue)'}
          </span>
        )}
        {task._count && (
          <span className="flex items-center gap-1">
            <MessageCircle size={12} />
            {task._count.messages} msg
          </span>
        )}
        {task.quotes?.length > 0 && (
          <span className="flex items-center gap-1">
            <DollarSign size={12} />
            {task.quotes.length} quote{task.quotes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          by {task.createdBy.name}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {format(new Date(task.createdAt), 'dd MMM yyyy')}
          </span>
          {/* Delete button — distributor only */}
          {isDistributor && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete task"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
