export default function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 px-5 py-12 text-sm text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label}
    </div>
  );
}
