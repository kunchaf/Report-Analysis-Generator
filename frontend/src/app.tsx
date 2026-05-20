import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';
import ReaderModal from './components/ReaderModal';

// Empty = same origin (production). Fallback to localhost for local dev.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export interface ProgressStep {
  status: 'started' | 'processing' | 'complete';
  message: string;
  progress: number;
}

export interface Perspective {
  key: string;
  label: string;
  icon: string;
  content: string;
}

export interface AnalysisResult {
  topic: string;
  generated_at: string;
  perspectives: Record<string, Perspective>;
}

const SELECTED_PERSPECTIVES = [
  'executive_summary',
  'strategic_analysis',
  'critical_analysis',
  'opportunities_risks',
];

function App() {
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showReader, setShowReader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState<ProgressStep | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Revoke object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const startSSEStream = () => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    const es = new EventSource(`${API_URL}/api/notifications/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: ProgressStep = JSON.parse(event.data);
        setProgressStep(data);
        if (data.status === 'complete') {
          es.close();
          eventSourceRef.current = null;
        }
      } catch { /* ignore malformed frames */ }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
    };
  };

  const stopSSEStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    setLoading(true);
    setPdfUrl(null);
    setAnalysis(null);
    setError(null);
    setProgressStep(null);
    setShowReader(false);

    startSSEStream();

    try {
      // Step 1: Run AI analysis once
      const analyzeRes = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: textInput, perspectives: SELECTED_PERSPECTIVES }),
      });

      if (!analyzeRes.ok) {
        const errData = await analyzeRes.json().catch(() => ({}));
        throw new Error(errData.detail || `Analysis error: ${analyzeRes.status}`);
      }

      const analysisData: AnalysisResult = await analyzeRes.json();
      setAnalysis(analysisData);

      // Step 2: Convert the same analysis to PDF — no second AI call
      const pdfRes = await fetch(`${API_URL}/api/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData),
      });

      if (!pdfRes.ok) {
        const errData = await pdfRes.json().catch(() => ({}));
        throw new Error(errData.detail || `PDF error: ${pdfRes.status}`);
      }

      const blob = await pdfRes.blob();
      setPdfUrl(window.URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      stopSSEStream();
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans flex flex-col">
      <Navbar />
      <main className="max-w-7xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        <InputPanel
          textInput={textInput}
          loading={loading}
          error={error}
          onChange={setTextInput}
          onSubmit={handleSubmit}
        />
        <OutputPanel
          loading={loading}
          pdfUrl={pdfUrl}
          error={error}
          progressStep={progressStep}
          onReadOnUI={() => setShowReader(true)}
        />
      </main>

      {showReader && analysis && (
        <ReaderModal
          analysis={analysis}
          pdfUrl={pdfUrl}
          onClose={() => setShowReader(false)}
        />
      )}
    </div>
  );
}

export default App;
