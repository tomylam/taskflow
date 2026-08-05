import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Task, TaskStatus, TaskType } from '../types';
import TaskCard from '../components/TaskCard';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { STATUS_LABELS, TYPE_LABELS } from '../lib/constants';

type SortKey = 'createdAt' | 'deadline' | 'title' | 'status';
type SortDir = 'asc' | 'desc';

export default function DashboardPage() {
  const { isDistributor } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      const { data } = await api.get(`/tasks?${params}`);
      return data;
    },
    refetchInterval: 20_000,
  });

  // Search filter
  const searched = tasks.filter(
    (t) =>
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.university?.toLowerCase().includes(search.toLowerCase()) ||
      t.aiDescription?.toLowerCase().includes(search.toLowerCase())
  );

  // Sort
  const STATUS_ORDER: Record<TaskStatus, number> = {
    PENDING_QUOTE: 0, QUOTED: 1, IN_PROGRESS: 2, SUBMITTED: 3, REVISION: 4, COMPLETED: 5,
  };

  const sorted = [...searched].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'createdAt') {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortKey === 'deadline') {
      const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      cmp = da - db;
    } else if (sortKey === 'title') {
      cmp = a.title.localeCompare(b.title);
    } else if (sortKey === 'status') {
      cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const statuses: TaskStatus[] = ['PENDING_QUOTE', 'QUOTED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION', 'COMPLETED'];
  const types: TaskType[] = ['ESSAY', 'POWERPOINT', 'SPSS', 'QUESTIONNAIRE', 'LONG_TERM', 'MIXED'];
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'createdAt', label: 'Date Created' },
    { key: 'deadline', label: 'Deadline' },
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
  ];

  const counts = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'PENDING_QUOTE').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter((t) => t.status === 'COMPLETED').length,
  };

  // Count unseen for distributor (local, avoids extra request)
  const unseenCount = isDistributor ? tasks.filter((t) => !t.seenByDistributor).length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isDistributor
              ? unseenCount > 0
                ? `${unseenCount} task${unseenCount > 1 ? 's have' : ' has'} new provider updates`
                : 'Manage and track all distributed tasks'
              : 'View available and active tasks'}
          </p>
        </div>
        {isDistributor && (
          <Link to="/tasks/new" className="btn-primary">
            <PlusCircle size={16} />
            New Task
          </Link>
        )}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: counts.total, color: 'text-gray-900' },
          { label: 'Awaiting Quote', value: counts.pending, color: 'text-yellow-600' },
          { label: 'In Progress', value: counts.inProgress, color: 'text-indigo-600' },
          { label: 'Completed', value: counts.completed, color: 'text-green-600' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Sort */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <SlidersHorizontal size={16} className="text-gray-400" />
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>

        {/* Sort controls */}
        <div className="flex items-center gap-1.5 ml-auto">
          <ArrowUpDown size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500">Sort:</span>
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => toggleSort(opt.key)}
              className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors
                ${sortKey === opt.key
                  ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {opt.label}
              {sortKey === opt.key && (
                <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Task grid */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Loading tasks…</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 mb-4">No tasks found.</p>
          {isDistributor && (
            <Link to="/tasks/new" className="btn-primary inline-flex">
              <PlusCircle size={16} /> Create your first task
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
