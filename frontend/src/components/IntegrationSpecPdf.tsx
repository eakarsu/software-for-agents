import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { FileText, Download } from 'lucide-react';

type Resp = {
  title: string;
  filename: string;
  generated_at: string;
  markdown: string;
  bytes: number;
};

export default function IntegrationSpecPdf() {
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiFetch('/custom-views/integration-spec-pdf')
      .then(setData)
      .catch(e => setErr(String(e.message || e)));
  }, []);

  function download() {
    if (!data) return;
    const blob = new Blob([data.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (err) return <div className="text-red-400 text-sm">Error: {err}</div>;
  if (!data) return <div className="text-gray-500 text-sm">Loading spec…</div>;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-violet-400" />
        <h2 className="text-white font-semibold">Integration Spec (PDF)</h2>
        <span className="ml-auto text-xs text-gray-500">{data.bytes} bytes</span>
        <button
          onClick={download}
          className="ml-3 inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium px-3 py-1.5 rounded-md"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
      </div>
      <pre className="text-xs text-gray-300 bg-gray-950 border border-gray-800 rounded-lg p-4 max-h-96 overflow-auto whitespace-pre-wrap font-mono">
        {data.markdown}
      </pre>
    </div>
  );
}
