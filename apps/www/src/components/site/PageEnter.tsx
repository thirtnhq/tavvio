"use client";

import { type ReactNode } from "react";
import { motion } from "motion/react";

/**
 * Subtle on-mount fade for non-home pages — gives a sense of route transition
 * without a full layout-level AnimatePresence (which has known issues with the
 * Next.js app router). Keep the duration short so it never feels in the way.
 */
export function PageEnter({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
