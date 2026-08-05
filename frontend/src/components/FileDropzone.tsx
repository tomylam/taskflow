import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, File } from 'lucide-react';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  multiple?: boolean;
  accept?: Record<string, string[]>;
}

export default function FileDropzone({ files, onChange, multiple = true, accept }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      onChange(multiple ? [...files, ...accepted] : accepted.slice(0, 1));
    },
    [files, onChange, multiple]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple,
    accept,
  });

  function remove(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto mb-2 text-gray-400" size={32} />
        <p className="text-sm text-gray-600">
          {isDragActive ? 'Drop files here…' : 'Drag & drop files, or click to select'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Supports all document, image, and multimedia formats
        </p>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
            >
              <File size={16} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
              <span className="text-xs text-gray-400 shrink-0">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
