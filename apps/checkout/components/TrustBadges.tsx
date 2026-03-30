"use client";

import { ShieldCheck, Lock, Lightning } from "@phosphor-icons/react";

export function TrustBadges() {
  return (
    <div className="space-y-3">
      {/* Trust indicators */}
      <div className="flex items-center justify-center gap-4 text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Lock size={14} weight="fill" />
          <span className="text-xs">Encrypted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} weight="fill" />
          <span className="text-xs">Secure</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lightning size={14} weight="fill" />
          <span className="text-xs">Instant</span>
        </div>
      </div>

      {/* Powered by */}
      <p className="text-center text-xs text-muted-foreground/60">
        Powered by{" "}
        <span className="font-display font-semibold text-muted-foreground">
          Useroutr
        </span>
      </p>
    </div>
  );
}
