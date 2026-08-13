export default function SupplierLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 h-8 w-64 animate-pulse rounded-lg bg-black/5" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl2 bg-black/5" />
        ))}
      </div>
    </div>
  );
}
