"use client";

export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-background-elevated rounded ${className}`}
    />
  );
}

export function MarketCardSkeleton() {
  return (
    <div className="bg-background-elevated rounded-lg p-6 border border-border-color">
      <div className="flex items-start gap-4 mb-4">
        <LoadingSkeleton className="w-24 h-36" />
        <div className="flex-1">
          <LoadingSkeleton className="h-6 w-3/4 mb-2" />
          <LoadingSkeleton className="h-4 w-1/2 mb-4" />
          <div className="flex gap-2">
            <LoadingSkeleton className="h-6 w-20" />
            <LoadingSkeleton className="h-6 w-20" />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <LoadingSkeleton className="h-10 flex-1" />
        <LoadingSkeleton className="h-10 flex-1" />
      </div>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="bg-background-elevated rounded-lg border border-border-color overflow-hidden">
      <div className="p-4 border-b border-border-color">
        <LoadingSkeleton className="h-8 w-48" />
      </div>
      <div className="divide-y divide-border-color">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <LoadingSkeleton className="w-8 h-8" />
            <LoadingSkeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <LoadingSkeleton className="h-4 w-32 mb-2" />
              <LoadingSkeleton className="h-3 w-24" />
            </div>
            <LoadingSkeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-background-elevated rounded-lg p-6 border border-border-color">
      <LoadingSkeleton className="h-4 w-24 mb-4" />
      <LoadingSkeleton className="h-10 w-32 mb-2" />
      <LoadingSkeleton className="h-3 w-40" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-color">
            <th className="py-3 px-4">
              <LoadingSkeleton className="h-4 w-20" />
            </th>
            <th className="py-3 px-4">
              <LoadingSkeleton className="h-4 w-24" />
            </th>
            <th className="py-3 px-4">
              <LoadingSkeleton className="h-4 w-16" />
            </th>
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, i) => (
            <tr key={i} className="border-b border-border-color">
              <td className="py-4 px-4">
                <LoadingSkeleton className="h-4 w-32" />
              </td>
              <td className="py-4 px-4">
                <LoadingSkeleton className="h-4 w-24" />
              </td>
              <td className="py-4 px-4">
                <LoadingSkeleton className="h-4 w-16" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <LoadingSkeleton className="h-10 w-64 mb-2" />
      <LoadingSkeleton className="h-6 w-96 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}

export default LoadingSkeleton;
