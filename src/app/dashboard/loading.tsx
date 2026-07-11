const metricCards = ["Ringkasan", "Antrean", "Stok", "Buyer"];

export default function DashboardLoading() {
  const pulseClass = "animate-pulse rounded-full bg-current/10";

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#0B1013] text-[#F8F4EA]">
      <div className="grid h-[100dvh] grid-cols-[minmax(0,1fr)] lg:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/10 bg-[#101820] p-5 lg:block">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-[12px] bg-current/10" />
            <div className="space-y-2">
              <div className={`h-3 w-28 ${pulseClass}`} />
              <div className={`h-2 w-36 ${pulseClass}`} />
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {[0, 1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[12px] border border-white/10 bg-white/[0.03] p-3">
                <div className="h-8 w-8 animate-pulse rounded-[10px] bg-current/10" />
                <div className={`h-3 w-36 ${pulseClass}`} />
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0 overflow-y-auto">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0B1013]/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <div className={`h-3 w-24 ${pulseClass}`} />
                <div className={`h-7 w-56 ${pulseClass}`} />
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <div className={`h-10 w-56 ${pulseClass}`} />
                <div className="h-10 w-10 animate-pulse rounded-[12px] bg-current/10" />
                <div className="h-10 w-10 animate-pulse rounded-[12px] bg-current/10" />
              </div>
            </div>
          </header>

          <div className="mx-auto grid max-w-[1680px] gap-5 px-4 py-5 sm:px-6 lg:px-8">
            <div className="rounded-[16px] border border-white/10 bg-[#172027] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <div className={`h-3 w-28 ${pulseClass}`} />
                  <div className={`h-8 w-72 max-w-full ${pulseClass}`} />
                  <div className={`h-3 w-[min(520px,90vw)] max-w-full ${pulseClass}`} />
                </div>
                <div className="flex gap-2">
                  <div className={`h-10 w-32 ${pulseClass}`} />
                  <div className={`h-10 w-28 ${pulseClass}`} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((item, index) => (
                <div key={item} className="rounded-[14px] border border-white/10 bg-[#172027] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-3">
                      <div className={`h-3 w-20 ${pulseClass}`} />
                      <div className={`h-7 ${index === 0 ? "w-24" : "w-16"} ${pulseClass}`} />
                    </div>
                    <div className="h-10 w-10 animate-pulse rounded-[12px] bg-current/10" />
                  </div>
                  <div className={`mt-5 h-2 w-full ${pulseClass}`} />
                  <div className={`mt-3 h-2 w-2/3 ${pulseClass}`} />
                </div>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
              <div className="rounded-[16px] border border-white/10 bg-[#172027] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-3">
                    <div className={`h-4 w-40 ${pulseClass}`} />
                    <div className={`h-3 w-56 max-w-full ${pulseClass}`} />
                  </div>
                  <div className={`h-9 w-24 ${pulseClass}`} />
                </div>
                <div className="mt-5 grid gap-3">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="rounded-[12px] border border-white/10 bg-[#101820] p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-2">
                          <div className={`h-4 w-48 max-w-full ${pulseClass}`} />
                          <div className={`h-3 w-72 max-w-full ${pulseClass}`} />
                        </div>
                        <div className="flex gap-2">
                          <div className={`h-8 w-20 ${pulseClass}`} />
                          <div className={`h-8 w-20 ${pulseClass}`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[16px] border border-white/10 bg-[#172027] p-5">
                <div className="space-y-3">
                  <div className={`h-4 w-36 ${pulseClass}`} />
                  <div className={`h-3 w-64 max-w-full ${pulseClass}`} />
                </div>
                <div className="mt-6 grid h-56 grid-cols-6 items-end gap-2">
                  {[62, 38, 78, 52, 88, 66].map((height, index) => (
                    <div key={`${height}-${index}`} className="flex h-full items-end">
                      <div className="w-full animate-pulse rounded-t-[10px] bg-current/10" style={{ height: `${height}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
