"use client";

import {
  useState,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { WaitlistModal } from "./WaitlistModal";

interface WaitlistApi {
  open: () => void;
}

const WaitlistCtx = createContext<WaitlistApi>({ open: () => {} });

/** Hook for any client component nested under PageShell to open the waitlist modal. */
export function useWaitlist(): WaitlistApi {
  return useContext(WaitlistCtx);
}

/**
 * Shared shell for non-home pages. Accepts plain ReactNode children so it can
 * be used from server components (e.g. /use-cases pages with metadata exports).
 * Children that need to trigger the waitlist modal should be client components
 * that import `useWaitlist` (or use the `WaitlistButton` helper below).
 */
export function PageShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const api: WaitlistApi = { open: () => setOpen(true) };

  return (
    <WaitlistCtx.Provider value={api}>
      <Navbar onWaitlistClick={api.open} />
      <main className="pt-[68px]">{children}</main>
      <Footer />
      <WaitlistModal open={open} onOpenChange={setOpen} />
    </WaitlistCtx.Provider>
  );
}
