import React, { useState } from 'react';
import { Message as MessageType } from '../types';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Send } from 'lucide-react';

interface Props {
  messages: MessageType[];
  onSend: (body: string) => void;
  isSending?: boolean;
}

export default function MessageThread({ messages, onSend, isSending }: Props) {
  const { user } = useAuth();
  const [body, setBody] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    onSend(body);
    setBody('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter alone sends; Shift+Enter inserts a newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!body.trim() || isSending) return;
      onSend(body);
      setBody('');
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-80 pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No messages yet. Start the conversation.</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender.id === user?.id;
          const isDistributor = msg.sender.role === 'DISTRIBUTOR';
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                  ${isMe
                    ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-tr-sm shadow-sm'
                    : isDistributor
                      ? 'bg-amber-50 border border-amber-200 text-gray-900 rounded-tl-sm'
                      : 'bg-emerald-50 border border-emerald-200 text-gray-900 rounded-tl-sm'
                  }`}
              >
                {msg.body}
              </div>
              <span className="text-xs text-gray-400 mt-1 px-1">
                {msg.sender.name} · {format(new Date(msg.createdAt), 'dd MMM, HH:mm')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Compose */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          rows={3}
          className="input resize-none"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSending || !body.trim()}
            className="btn-primary"
          >
            <Send size={14} />
            {isSending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
