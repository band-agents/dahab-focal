/**
 * What a tap shows before the next screen's data has arrived.
 *
 * Even at 200 ms, a tap that does nothing reads as a tap that did not
 * register, and people tap again. Next shows this the moment the navigation
 * starts — and prefetches it with every link in view — so the header and the
 * outline of the next screen are there under the finger immediately, and the
 * real rows replace them in place.
 *
 * It is drawn in the same shape as a real screen: a header of the same
 * height, a pair of stat tiles, a panel of rows. A placeholder that differs
 * in shape from what it stands in for makes the page jump when the content
 * lands, which feels slower than no placeholder at all.
 *
 * No words: a loading screen cannot know the locale without a round trip,
 * and `aria-busy` tells a screen reader what the shimmer tells everyone else.
 */
export default function Loading() {
  return (
    <div aria-busy="true">
      <header className="sticky top-0 z-20 border-b border-c-edge bg-c-glass backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[var(--console-content-max)] items-start gap-2 px-3 pb-3 pt-2.5 lg:px-8 lg:pb-4 lg:pt-4">
          <span className="mt-3 size-10 shrink-0 rounded-full console-skeleton" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
            <span className="h-3 w-28 rounded-c-xs console-skeleton" />
            <span className="h-6 w-48 max-w-full rounded-c-xs console-skeleton" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[var(--console-content-max)] px-3 py-4 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:px-8 lg:py-6">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((tile) => (
              <span key={tile} className="h-20 rounded-c-sm console-skeleton" />
            ))}
          </div>

          <div className="overflow-hidden rounded-c-md border border-c-edge bg-c-surface">
            <div className="border-b border-c-edge px-4 py-3">
              <span className="block h-4 w-32 rounded-c-xs console-skeleton" />
            </div>
            {[0, 1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="flex min-h-[3.5rem] items-center gap-3 border-b border-c-edge px-4 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="h-3.5 w-3/5 rounded-c-xs console-skeleton" />
                  <span className="h-3 w-2/5 rounded-c-xs console-skeleton" />
                </div>
                <span className="h-5 w-16 shrink-0 rounded-c-xs console-skeleton" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
