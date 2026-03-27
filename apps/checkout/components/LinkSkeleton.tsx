export function LinkSkeleton() {
  return (
    <div className="flex min-h-screen justify-center bg-muted/30 px-4 py-8 sm:px-8">
      <div className="w-full max-w-[460px] space-y-6">
        {/* Merchant branding skeleton */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-pulse rounded-lg bg-muted" />
          <div className="mx-auto mt-2 h-5 w-32 animate-pulse rounded bg-muted" />
        </div>

        {/* Link card skeleton */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            {/* Merchant info */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
            
            {/* Amount */}
            <div className="border-t border-border pt-4">
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>

        {/* Email input skeleton */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
            <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        </div>

        {/* Trust badges - static since they don't need loading */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-12 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-10 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-12 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="text-center">
            <div className="mx-auto h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}