import React from 'react';
import { Loader2, XCircle } from 'lucide-react';

const CHAR_LIMIT = 5000;

interface InputPanelProps {
  textInput: string;
  loading: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function InputPanel({ textInput, loading, error, onChange, onSubmit }: InputPanelProps) {
  const charCount = textInput.length;

  return (
    <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-1 text-slate-900">Semantic Vector Input</h2>
        <p className="text-sm text-slate-500 mb-6">
          Describe your operational concept or startup blueprint in raw narrative text chunks.
        </p>

        <textarea
          className="w-full h-64 p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none font-mono text-slate-800"
          placeholder="Type or paste unstructured operational plans here..."
          value={textInput}
          maxLength={CHAR_LIMIT}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Topic input"
        />

        {/* Character counter */}
        <div
          className={`text-right text-xs mt-1 font-mono ${
            charCount > CHAR_LIMIT * 0.9 ? 'text-amber-500' : 'text-slate-400'
          }`}
        >
          {charCount.toLocaleString()} / {CHAR_LIMIT.toLocaleString()}
        </div>
      </div>

      {/* Inline error banner */}
      {error && (
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <XCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Analysis failed</p>
            <p className="text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={loading || !textInput.trim()}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold shadow-sm hover:bg-blue-700 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 transition-all mt-4 flex items-center justify-center gap-2"
        aria-busy={loading}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Compiling Perspective Matrix...
          </>
        ) : (
          'Execute 360° Assessment'
        )}
      </button>
    </section>
  );
}
