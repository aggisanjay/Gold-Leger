export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-end justify-between border-b border-line pb-4">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-lg bg-sunk" />
          <div className="h-4 w-72 rounded bg-sunk/70" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-sunk" />
      </div>

      {/* Metric cards / Summary row skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-line bg-paper p-5 space-y-3">
            <div className="h-3.5 w-24 rounded bg-sunk/80" />
            <div className="h-8 w-32 rounded-lg bg-sunk" />
          </div>
        ))}
      </div>

      {/* Main content / table skeleton */}
      <div className="rounded-xl border border-line bg-paper p-6 space-y-4">
        <div className="h-5 w-40 rounded bg-sunk" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between border-b border-line/60 py-3">
              <div className="h-4 w-44 rounded bg-sunk" />
              <div className="h-4 w-28 rounded bg-sunk/80" />
              <div className="h-4 w-20 rounded bg-sunk/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

