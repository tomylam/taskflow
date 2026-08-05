import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import FileDropzone from '../components/FileDropzone';
import { TaskType } from '../types';
import { TYPE_LABELS } from '../lib/constants';
import { ArrowLeft, Plus, X, Upload } from 'lucide-react';

const TASK_TYPES: TaskType[] = ['ESSAY', 'POWERPOINT', 'SPSS', 'QUESTIONNAIRE', 'LONG_TERM', 'MIXED'];

export default function CreateTaskPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: '',
    rawPrompt: '',
    taskType: 'ESSAY' as TaskType,
    wordCount: '',
    deadline: '',
    university: '',
  });
  const [stages, setStages] = useState<string[]>([]);
  const [newStage, setNewStage] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, String(v)); });
      files.forEach((f) => fd.append('files', f));
      if (stages.length) fd.append('stages', JSON.stringify(stages));
      const { data } = await api.post('/tasks', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success('Task created successfully.');
      navigate(`/tasks/${data.id}`);
    },
    onError: () => toast.error('Failed to create task'),
  });

  function addStage() {
    if (newStage.trim()) {
      setStages([...stages, newStage.trim()]);
      setNewStage('');
    }
  }

  function removeStage(idx: number) {
    setStages(stages.filter((_, i) => i !== idx));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary !px-2.5 !py-2">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Create New Task</h1>
          <p className="text-sm text-gray-500">Fill in the task details and upload supporting documents</p>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        className="space-y-6"
      >
        {/* Basic info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Task Details</h2>
          <div>
            <label className="label">Task Title *</label>
            <input
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. MBA Essay — Leadership Module"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Task Type</label>
              <select
                className="input"
                value={form.taskType}
                onChange={(e) => setForm({ ...form, taskType: e.target.value as TaskType })}
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Word Count (optional)</label>
              <input
                type="number"
                className="input"
                value={form.wordCount}
                onChange={(e) => setForm({ ...form, wordCount: e.target.value })}
                placeholder="e.g. 2500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Deadline (optional)</label>
              <input
                type="date"
                className="input"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
            <div>
              <label className="label">University (optional)</label>
              <input
                className="input"
                value={form.university}
                onChange={(e) => setForm({ ...form, university: e.target.value })}
                placeholder="e.g. University of Sydney"
              />
            </div>
          </div>
          <div>
            <label className="label">Description / Notes</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.rawPrompt}
              onChange={(e) => setForm({ ...form, rawPrompt: e.target.value })}
              placeholder="Paste the assignment brief or any extra instructions…"
            />
          </div>
        </div>

        {/* Stages (for long-term tasks) */}
        {form.taskType === 'LONG_TERM' && (
          <div className="card p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Task Stages</h2>
            <p className="text-sm text-gray-500">Define each stage (e.g. Abstract, Draft, Full Paper)</p>
            {stages.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm">{s}</span>
                <button type="button" onClick={() => removeStage(idx)} className="text-gray-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Stage name (e.g. Abstract)"
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStage())}
              />
              <button type="button" onClick={addStage} className="btn-secondary">
                <Plus size={15} /> Add
              </button>
            </div>
          </div>
        )}

        {/* File upload */}
        <div className="card p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Upload size={16} className="text-gray-500" />
            Upload Documents
            <span className="text-xs font-normal text-gray-400">(up to 100 MB per file)</span>
          </h2>
          <FileDropzone files={files} onChange={setFiles} />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !form.title}
            className="btn-primary flex-1 justify-center"
          >
            {mutation.isPending ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}
