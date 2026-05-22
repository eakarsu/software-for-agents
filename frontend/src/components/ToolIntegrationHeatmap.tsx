import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { Grid3x3 } from 'lucide-react';

type Cell = { runtime: string; category: string; score: number };
type Resp = {
  generated_at: string;
  runtimes: string[];
  categories: string[];
  scale: { min: number; max: number };
  cells: Cell[];
};

function shade(score: number, max: number): string {
  const ratio = max > 0 ? Math.min(1, Math.max(0, score / max)) : 0;
  if (ratio < 0.15) return 'bg-gray-800 text-gray-500';
  if (ratio < 0.35) return 'bg-violet-900 text-violet-100';
  if (ratio < 0.55) return 'bg-violet-700 text-white';
  if (ratio < 0.75) return 'bg-violet-600 text-white';
  return 'bg-violet-500 text-white';
}

export default function ToolIntegrationHeatmap() {
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiFetch('/custom-views/tool-integration-heatmap')
      .then(setData)
      .catch(e => setErr(String(e.message || e)));
  }, []);

  if (err) return <div className="text-red-400 text-sm">Error: {err}</div>;
  if (!data) return <div className="text-gray-500 text-sm">Loading heatmap…</div>;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 overflow-x-auto">
      <div className="flex items-center gap-2 mb-4">
        <Grid3x3 className="w-4 h-4 text-violet-400" />
        <h2 className="text-white font-semibold">Tool Integration Heatmap</h2>
        <span className="ml-auto text-xs text-gray-500">
          {data.runtimes.length} runtimes × {data.categories.length} categories
        </span>
      </div>
      <table className="border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="text-left text-gray-400 font-medium pr-2"></th>
            {data.categories.map(c => (
              <th key={c} className="text-gray-400 font-medium px-2 py-1 whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.runtimes.map(rt => (
            <tr key={rt}>
              <td className="text-gray-300 font-medium pr-2 whitespace-nowrap">{rt}</td>
              {data.categories.map(c => {
                const cell = data.cells.find(x => x.runtime === rt && x.category === c);
                const score = cell?.score ?? 0;
                return (
                  <td
                    key={c}
                    className={`text-center font-mono w-10 h-10 rounded ${shade(score, data.scale.max)}`}
                    title={`${rt} × ${c}: ${score}/${data.scale.max}`}
                  >
                    {score}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <span>low</span>
        <span className="w-4 h-3 rounded bg-gray-800" />
        <span className="w-4 h-3 rounded bg-violet-900" />
        <span className="w-4 h-3 rounded bg-violet-700" />
        <span className="w-4 h-3 rounded bg-violet-600" />
        <span className="w-4 h-3 rounded bg-violet-500" />
        <span>high</span>
      </div>
    </div>
  );
}
