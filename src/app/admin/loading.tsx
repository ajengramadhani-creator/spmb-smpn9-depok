export default function AdminLoading() {
  return (
    <div aria-label="Memuat portal admin" className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}
