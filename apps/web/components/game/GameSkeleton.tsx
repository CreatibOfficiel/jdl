export function GameSkeleton({ message = 'Chargement…' }: { message?: string }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-4">
      <header className="mb-3 flex items-baseline justify-between">
        <div className="h-6 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="h-6 w-16 animate-pulse rounded bg-zinc-200" />
      </header>
      <div className="flex gap-2 py-1">
        <div className="h-9 w-32 animate-pulse rounded-full bg-zinc-200" />
        <div className="h-9 w-32 animate-pulse rounded-full bg-zinc-200" />
      </div>
      <div className="my-3 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="aspect-square w-full max-w-2xl animate-pulse rounded-2xl bg-zinc-100" />
        <aside className="space-y-3">
          <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-100" />
        </aside>
      </div>
      <p className="mt-4 text-center text-sm text-zinc-500">{message}</p>
    </main>
  );
}
