import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Download } from 'lucide-react';

interface Perspective {
  key: string;
  label: string;
  icon: string;
  content: string;
}

interface AnalysisResult {
  topic: string;
  generated_at: string;
  perspectives: Record<string, Perspective>;
}

interface ReaderModalProps {
  analysis: AnalysisResult;
  pdfUrl: string | null;
  onClose: () => void;
}

export default function ReaderModal({ analysis, pdfUrl, onClose }: ReaderModalProps) {
  const perspectives = Object.values(analysis.perspectives);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Intelligence Report Reader"
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col">

        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-5 flex items-start justify-between rounded-t-2xl z-10">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">
              RAIG Intelligence Report
            </p>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{analysis.topic}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Generated: {analysis.generated_at.slice(0, 10)} &nbsp;·&nbsp; {perspectives.length} perspectives
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            {pdfUrl && (
              <a
                href={pdfUrl}
                download="AI_Risk_Synthesis.pdf"
                className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 transition"
              >
                <Download size={15} />
                Download PDF
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Close reader"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/60">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Contents</p>
          <div className="flex flex-wrap gap-2">
            {perspectives.map((p, i) => (
              <a
                key={p.key}
                href={`#section-${p.key}`}
                className="text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition font-medium"
              >
                {i + 1}. {p.label}
              </a>
            ))}
          </div>
        </div>

        {/* Perspective Sections */}
        <div className="px-8 py-6 space-y-10">
          {perspectives.map((p, i) => (
            <section key={p.key} id={`section-${p.key}`}>
              {/* Section header */}
              <div className="bg-slate-900 text-white rounded-xl px-6 py-4 mb-5">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">
                  Section {i + 1} of {perspectives.length}
                </p>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span>{p.icon}</span> {p.label}
                </h3>
              </div>

              {/* Markdown content */}
              <div className="prose prose-slate prose-sm max-w-none
                prose-headings:font-bold prose-headings:text-slate-800
                prose-h2:text-base prose-h3:text-sm
                prose-p:text-slate-700 prose-p:leading-relaxed
                prose-li:text-slate-700
                prose-strong:text-slate-900
                prose-ul:my-2 prose-li:my-0.5">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {p.content}
                </ReactMarkdown>
              </div>

              {i < perspectives.length - 1 && (
                <div className="mt-10 border-t border-slate-100" />
              )}
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-between">
          <p className="text-xs text-slate-400">Report &amp; Analysis Intelligence Generator v1.0 · Confidential</p>
          {pdfUrl && (
            <a
              href={pdfUrl}
              download="AI_Risk_Synthesis.pdf"
              className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 transition"
            >
              <Download size={15} />
              Download PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
