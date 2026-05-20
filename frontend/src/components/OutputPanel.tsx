import { Loader2, CheckCircle2, Download, AlertCircle, BookOpen } from 'lucide-react';

interface ProgressStep {
  status: 'started' | 'processing' | 'complete';
  message: string;
  progress: number;
}

interface OutputPanelProps {
  loading: boolean;
  pdfUrl: string | null;
  error: string | null;
  progressStep: ProgressStep | null;
  onReadOnUI: () => void;
}

const PIPELINE_STAGES = [
  { label: '1. Executive Summary & Strategic Risk Profiler', doneAt: 40 },
  { label: '2. Critical Analysis & Opportunities / Risks', doneAt: 80 },
  { label: '3. PDF Compilation & Report Assembly', doneAt: 95 },
];

export default function OutputPanel({ loading, pdfUrl, error, progressStep, onReadOnUI }: OutputPanelProps) {
  const isIdle = !loading && !pdfUrl && !error;
  const currentProgress = progressStep?.progress ?? (pdfUrl ? 100 : 0);

  if (isIdle) {
    return (
      <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-center items-center">
        <div className="text-center p-8 max-w-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4 text-2xl">
            🔮
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">System Awaiting Execution</h3>
          <p className="text-sm text-slate-400">
            Provide an unstructured operational text sequence on the left panel to trigger your deep automated vector assessment.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4 text-slate-900">Analysis Output Stream</h2>

        {/* Real-time progress bar */}
        {(loading || pdfUrl) && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{progressStep?.message ?? (pdfUrl ? 'Report ready.' : 'Initializing...')}</span>
              <span>{currentProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2" role="progressbar" aria-valuenow={currentProgress} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Pipeline status items */}
        <div className="space-y-3">
          {PIPELINE_STAGES.map((stage) => {
            const isDone = !!pdfUrl || currentProgress >= stage.doneAt;
            const isActive = loading && currentProgress < stage.doneAt && currentProgress >= stage.doneAt - 40;

            return (
              <div
                key={stage.label}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
              >
                <span className="text-sm font-medium text-slate-700">{stage.label}</span>
                {isDone ? (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12} /> Completed
                  </span>
                ) : isActive ? (
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                    <Loader2 size={12} className="animate-spin" /> Processing...
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    Queued
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Download + Read on UI buttons */}
      {pdfUrl && (
        <div className="mt-6 border-t border-slate-100 pt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onReadOnUI}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-xl font-semibold shadow-sm hover:bg-blue-700 transition"
          >
            <BookOpen size={18} />
            <span>Read on UI</span>
          </button>
          <a
            href={pdfUrl}
            download="AI_Risk_Synthesis.pdf"
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl font-semibold shadow-sm hover:bg-emerald-700 transition"
          >
            <Download size={18} />
            <span>Download PDF</span>
          </a>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="mt-6 flex items-center gap-3 text-red-500 text-sm">
          <AlertCircle size={16} />
          <span>Analysis could not be completed. See details on the left.</span>
        </div>
      )}
    </section>
  );
}
