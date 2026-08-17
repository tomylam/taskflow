import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Task, TaskStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import StatusTimeline from '../components/StatusTimeline';
import MessageThread from '../components/MessageThread';
import FileDropzone from '../components/FileDropzone';
import { format } from 'date-fns';
import {
  ArrowLeft, Calendar, Building, FileText, ExternalLink,
  DollarSign, CheckCircle, XCircle, RotateCcw, Send,
  Upload, Layers, Sparkles, AlertCircle
} from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS, TYPE_LABELS, TYPE_COLORS } from '../lib/constants';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isDistributor, isProvider } = useAuth();
  const queryClient = useQueryClient();

  // ── Local state ───────────────────────────────────────
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteCurrency, setQuoteCurrency] = useState('USD');
  const [quoteNote, setQuoteNote] = useState('');
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadStageName, setUploadStageName] = useState('');
  const [submitFiles, setSubmitFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'files' | 'messages' | 'stages'>('details');

  // ── Data fetching ─────────────────────────────────────
  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${id}`);
      return data;
    },
    refetchInterval: 15_000,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['task', id] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }

  // ── Mutations ─────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: async (payload: { status: TaskStatus; feedback?: string }) => {
      const { data } = await api.patch(`/tasks/${id}/status`, payload);
      return data;
    },
    onSuccess: (_, vars) => {
      toast.success(`Task moved to ${STATUS_LABELS[vars.status]}`);
      invalidate();
    },
    onError: () => toast.error('Status update failed'),
  });

  const quoteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/quotes', {
        taskId: id,
        amount: Number(quoteAmount),
        currency: quoteCurrency,
        note: quoteNote,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Quote submitted!');
      setQuoteAmount('');
      setQuoteNote('');
      invalidate();
    },
    onError: () => toast.error('Failed to submit quote'),
  });

  const quoteActionMutation = useMutation({
    mutationFn: async ({ quoteId, status }: { quoteId: string; status: 'ACCEPTED' | 'REJECTED' }) => {
      const { data } = await api.patch(`/quotes/${quoteId}`, { status });
      return data;
    },
    onSuccess: (_, { status }) => {
      toast.success(status === 'ACCEPTED' ? 'Quote accepted! Task is now In Progress.' : 'Quote rejected.');
      invalidate();
    },
    onError: () => toast.error('Action failed'),
  });

  const messageMutation = useMutation({
    mutationFn: async (body: string) => {
      const { data } = await api.post(`/tasks/${id}/messages`, { body });
      return data;
    },
    onSuccess: () => invalidate(),
    onError: () => toast.error('Failed to send message'),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      uploadFiles.forEach((f) => fd.append('files', f));
      if (uploadStageName) fd.append('stageName', uploadStageName);
      const { data } = await api.post(`/tasks/${id}/files`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Files uploaded to Storj!');
      setUploadFiles([]);
      setUploadStageName('');
      invalidate();
    },
    onError: () => toast.error('Upload failed'),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      submitFiles.forEach((f) => fd.append('files', f));
      const { data } = await api.post(`/tasks/${id}/submit`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Work submitted successfully!');
      setSubmitFiles([]);
      invalidate();
    },
    onError: () => toast.error('Submission failed — please try again'),
  });

  const stageStatusMutation = useMutation({
    mutationFn: async ({ stageId, status }: { stageId: string; status: string }) => {
      const { data } = await api.patch(`/tasks/${id}/stages/${stageId}`, { status });
      return data;
    },
    onSuccess: () => {
      toast.success('Stage updated');
      invalidate();
    },
  });

  // ── Helpers ───────────────────────────────────────────

  const myActiveQuote = task?.quotes.find((q) => q.providerId === user?.id && q.status !== 'REJECTED');
  const acceptedQuote = task?.quotes.find((q) => q.status === 'ACCEPTED');
  const isOverdue = task?.deadline && new Date(task.deadline) < new Date() && task.status !== 'COMPLETED';

  // ── Render ────────────────────────────────────────────

  if (isLoading || !task) {
    return <div className="text-center py-20 text-gray-400">Loading task…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Back + header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/')} className="btn-secondary !px-2.5 !py-2 mt-0.5">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`badge ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
            <span className={`badge ${TYPE_COLORS[task.taskType]}`}>{TYPE_LABELS[task.taskType]}</span>
            {task.revisionRound > 0 && (
              <span className="badge bg-orange-100 text-orange-700">
                Revision #{task.revisionRound}
              </span>
            )}
            {isOverdue && (
              <span className="badge bg-red-100 text-red-700 flex items-center gap-1">
                <AlertCircle size={11} /> Overdue
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{task.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Created by {task.createdBy.name}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="card p-5">
        <StatusTimeline currentStatus={task.status} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        {(['details', 'files', 'messages', 'stages'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize
              ${activeTab === tab
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            {tab}
            {tab === 'messages' && task.messages.length > 0 && (
              <span className="ml-1.5 bg-gray-200 text-gray-600 text-xs rounded-full px-1.5 py-0.5">
                {task.messages.length}
              </span>
            )}
            {tab === 'files' && task.files.length > 0 && (
              <span className="ml-1.5 bg-gray-200 text-gray-600 text-xs rounded-full px-1.5 py-0.5">
                {task.files.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Details ─────────────────────────────── */}
      {activeTab === 'details' && (
        <div className="space-y-4">
          {/* Meta */}
          <div className="card p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {task.wordCount && (
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1"><FileText size={12} /> Word Count</p>
                <p className="font-semibold mt-0.5">{task.wordCount.toLocaleString()}</p>
              </div>
            )}
            {task.deadline && (
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12} /> Deadline</p>
                <p className={`font-semibold mt-0.5 ${isOverdue ? 'text-red-600' : ''}`}>
                  {format(new Date(task.deadline), 'dd MMM yyyy')}
                </p>
              </div>
            )}
            {task.university && (
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1"><Building size={12} /> University</p>
                <p className="font-semibold mt-0.5">{task.university}</p>
              </div>
            )}
          </div>

          {/* Distributor's original description */}
          {task.rawPrompt && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                <FileText size={15} className="text-gray-500" />
                Task Description
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {task.rawPrompt}
              </p>
            </div>
          )}

          {/* AI description */}
          {task.aiDescription && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                <Sparkles size={15} className="text-brand-500" />
                AI-Generated Task Brief
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {task.aiDescription}
              </p>
            </div>
          )}

          {/* Quotes section */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign size={15} /> Quotes
            </h3>

            {/* Provider: submit quote */}
            {isProvider && task.status === 'PENDING_QUOTE' && !myActiveQuote && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 space-y-3">
                <p className="text-sm font-medium text-blue-800">Submit your quote for this task</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="label">Amount</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="0.00"
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="w-24">
                    <label className="label">Currency</label>
                    <select
                      className="input"
                      value={quoteCurrency}
                      onChange={(e) => setQuoteCurrency(e.target.value)}
                    >
                      {['USD', 'EUR', 'GBP', 'AUD', 'MYR', 'SGD'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Note (optional)</label>
                  <input
                    className="input"
                    placeholder="Any remarks for the distributor…"
                    value={quoteNote}
                    onChange={(e) => setQuoteNote(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => quoteMutation.mutate()}
                  disabled={!quoteAmount || quoteMutation.isPending}
                  className="btn-primary"
                >
                  <Send size={14} /> Submit Quote
                </button>
              </div>
            )}

            {isProvider && task.quotes.filter((q) => q.providerId === user?.id).map((q) => (
              <div key={q.id} className={`rounded-lg border p-3 mb-3 text-sm
                ${q.status === 'ACCEPTED' ? 'bg-green-50 border-green-200 text-green-800' : ''}
                ${q.status === 'REJECTED' ? 'bg-red-50 border-red-200 text-red-700' : ''}
                ${q.status === 'PENDING' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : ''}
              `}>
                {q.status === 'REJECTED' ? 'Rejected quote' : 'Your quote'}: <strong>{q.currency} {q.amount.toFixed(2)}</strong> — {q.status}
                {q.note && <span className="text-gray-600"> · {q.note}</span>}
              </div>
            ))}

            {/* Distributor: review quotes */}
            {isDistributor && task.quotes.length > 0 && (
              <div className="space-y-2">
                {task.quotes.map((q) => (
                  <div key={q.id} className="flex items-center gap-3 border border-gray-200 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{q.provider.name}</p>
                      <p className="text-sm text-gray-700">
                        {q.currency} {q.amount.toFixed(2)}
                        {q.note && <span className="text-gray-500"> · {q.note}</span>}
                      </p>
                    </div>
                    {q.status === 'PENDING' && task.status === 'QUOTED' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => quoteActionMutation.mutate({ quoteId: q.id, status: 'ACCEPTED' })}
                          className="btn-primary !px-3 !py-1.5 text-xs"
                          disabled={quoteActionMutation.isPending}
                        >
                          <CheckCircle size={13} /> Accept
                        </button>
                        <button
                          onClick={() => quoteActionMutation.mutate({ quoteId: q.id, status: 'REJECTED' })}
                          className="btn-danger !px-3 !py-1.5 text-xs"
                          disabled={quoteActionMutation.isPending}
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    )}
                    {q.status !== 'PENDING' && (
                      <span className={`badge text-xs 
                        ${q.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {q.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {task.quotes.length === 0 && (
              <p className="text-sm text-gray-400">No quotes yet.</p>
            )}
          </div>

          {/* Provider: submit work with required files */}
          {isProvider && (task.status === 'IN_PROGRESS' || task.status === 'REVISION') && (
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Send size={15} />
                {task.status === 'REVISION' ? `Re-submit Revised Work (v${task.revisionRound + 1})` : 'Submit Work (v1)'}
              </h3>
              <p className="text-xs text-gray-500">
                At least one file is required. Files will be saved to{' '}
                <span className="font-medium text-gray-700">
                  Submitted Work / v{task.revisionRound + 1}
                </span>{' '}
                in Storj.
              </p>
              <FileDropzone files={submitFiles} onChange={setSubmitFiles} />
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitFiles.length === 0 || submitMutation.isPending}
                className="btn-primary"
              >
                <Send size={14} />
                {submitMutation.isPending ? 'Uploading & Submitting…' : 'Upload & Submit Work'}
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Actions</h3>
            <div className="flex flex-wrap gap-2">

              {/* Distributor reviews submission */}
              {isDistributor && task.status === 'SUBMITTED' && (
                <>
                  <button
                    onClick={() => statusMutation.mutate({ status: 'COMPLETED' })}
                    disabled={statusMutation.isPending}
                    className="btn-success"
                  >
                    <CheckCircle size={15} /> Accept & Complete
                  </button>
                  <div className="flex flex-col gap-2 flex-1 min-w-[260px]">
                    <textarea
                      className="input resize-none"
                      rows={4}
                      placeholder="Describe what needs to be revised…"
                      value={revisionFeedback}
                      onChange={(e) => setRevisionFeedback(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        statusMutation.mutate({ status: 'REVISION', feedback: revisionFeedback });
                        setRevisionFeedback('');
                      }}
                      disabled={statusMutation.isPending || !revisionFeedback.trim()}
                      className="btn-danger self-start"
                    >
                      <RotateCcw size={15} /> Request Revision
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Revision history */}
            {task.revisions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revision History</p>
                {task.revisions.map((r) => (
                  <div key={r.id} className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium text-orange-700">Round {r.round}</span>
                    <span className="text-gray-600"> — {r.feedback}</span>
                    <span className="text-gray-400 text-xs ml-2">
                      {format(new Date(r.requestedAt), 'dd MMM HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Files ───────────────────────────────── */}
      {activeTab === 'files' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={15} /> Uploaded Files
              <span className="text-xs text-gray-400 font-normal">— stored on Storj</span>
            </h3>
            {task.files.length === 0 ? (
              <p className="text-sm text-gray-400">No files uploaded yet.</p>
            ) : (
              <ul className="space-y-2">
                {task.files.map((file) => (
                  <li key={file.id} className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5">
                    <FileText size={16} className="text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.fileName}</p>
                      <p className="text-xs text-gray-400">
                        {file.stageName && <span className="text-brand-600 mr-2">Stage: {file.stageName}</span>}
                        by {file.uploadedBy.name} · {format(new Date(file.uploadedAt), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <a
                      href={file.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary !px-2.5 !py-1.5 text-xs"
                    >
                      <ExternalLink size={12} /> View
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Upload more files */}
          {(task.status !== 'COMPLETED') && (
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Upload size={15} /> Upload Files
              </h3>
              {task.stages.length > 0 && (
                <div>
                  <label className="label">Associate with Stage (optional)</label>
                  <select
                    className="input"
                    value={uploadStageName}
                    onChange={(e) => setUploadStageName(e.target.value)}
                  >
                    <option value="">— None —</option>
                    {task.stages.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <FileDropzone files={uploadFiles} onChange={setUploadFiles} />
              <button
                onClick={() => uploadMutation.mutate()}
                disabled={uploadFiles.length === 0 || uploadMutation.isPending}
                className="btn-primary"
              >
                <Upload size={14} />
                {uploadMutation.isPending ? 'Uploading…' : 'Upload Files'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Messages ────────────────────────────── */}
      {activeTab === 'messages' && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            Messages
            <span className="text-xs text-gray-400 font-normal">— between distributor and provider</span>
          </h3>
          <MessageThread
            messages={task.messages}
            onSend={(body) => messageMutation.mutate(body)}
            isSending={messageMutation.isPending}
          />
        </div>
      )}

      {/* ── Tab: Stages ──────────────────────────────── */}
      {activeTab === 'stages' && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Layers size={15} /> Task Stages
          </h3>
          {task.stages.length === 0 ? (
            <p className="text-sm text-gray-400">This task has no defined stages.</p>
          ) : (
            <div className="space-y-3">
              {task.stages.map((stage) => (
                <div key={stage.id} className="flex items-center gap-4 border border-gray-200 rounded-lg p-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {stage.order}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{stage.name}</p>
                    {stage.dueDate && (
                      <p className="text-xs text-gray-400">Due {format(new Date(stage.dueDate), 'dd MMM yyyy')}</p>
                    )}
                  </div>
                  <span className={`badge 
                    ${stage.status === 'APPROVED' ? 'bg-green-100 text-green-700' : ''}
                    ${stage.status === 'SUBMITTED' ? 'bg-purple-100 text-purple-700' : ''}
                    ${stage.status === 'IN_PROGRESS' ? 'bg-indigo-100 text-indigo-700' : ''}
                    ${stage.status === 'PENDING' ? 'bg-gray-100 text-gray-600' : ''}
                  `}>
                    {stage.status}
                  </span>
                  {/* Allow status progression */}
                  {task.status === 'IN_PROGRESS' && (
                    <select
                      className="input w-auto text-xs !py-1"
                      value={stage.status}
                      onChange={(e) => stageStatusMutation.mutate({ stageId: stage.id, status: e.target.value })}
                    >
                      {['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
