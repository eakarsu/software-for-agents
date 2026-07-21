export default function ReferenceBoundary({ feature }: { feature: string }) {
  return (
    <div className="min-h-screen bg-gray-950 p-8 text-gray-100">
      <div className="mx-auto max-w-2xl rounded-xl border border-amber-700 bg-amber-950/30 p-6">
        <h1 className="text-xl font-semibold">{feature}</h1>
        <p className="mt-3 text-sm text-amber-100">
          This is a reference-only concept, not an implemented product capability. It does not call an AI provider,
          persist pretend results, or execute tools.
        </p>
        <p className="mt-3 text-sm text-gray-300">
          The supported workflow is tenant-scoped knowledge ingestion, grounded answers, human approval, and isolated connector jobs.
        </p>
      </div>
    </div>
  );
}
