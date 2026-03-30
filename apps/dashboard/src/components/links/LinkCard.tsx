"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Separator,
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@tavvio/ui";
import { QrCode, Trash } from "@phosphor-icons/react";
import { formatCurrency } from "@/lib/utils";
import { LinkStatusBadge } from "./LinkStatusBadge";
import { CopyButton } from "./CopyButton";
import type { PaymentLink } from "@tavvio/types";

interface LinkCardProps {
  link: PaymentLink;
  onQRCode: (link: PaymentLink) => void;
  onDeactivate: (link: PaymentLink) => void;
}

export function LinkCard({ link, onQRCode, onDeactivate }: LinkCardProps) {
  const isExpired = link.status === "expired";
  const isDeactivated = link.status === "deactivated";
  const canDeactivate = !isExpired && !isDeactivated;

  const expiryLabel = link.expiresAt
    ? new Date(link.expiresAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : undefined;

  const isSingleUse = link.type === "single-use";

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        isExpired && "opacity-60",
        isDeactivated && "opacity-50"
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <p className="truncate text-xs text-[var(--muted-foreground)]">{link.id}</p>
        <LinkStatusBadge status={link.status} />
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Amount + Type */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-[var(--foreground)]">
            {link.amount
              ? formatCurrency(link.amount, link.currency)
              : "Open Amount"}
          </span>
          <span className="text-xs font-medium text-[var(--muted-foreground)]">
            {isSingleUse ? "Single-use" : "Multi-use"}
          </span>
        </div>

        {/* Description */}
        {link.description && (
          <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">
            {link.description}
          </p>
        )}

        {/* Usage + Expiry */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--muted-foreground)]">
            Used: <span className="font-medium text-[var(--foreground)]">{link.usageCount}</span> times
          </span>
          {expiryLabel ? (
            <span className="text-[var(--muted-foreground)]">
              Expires: <span className="font-medium text-[var(--foreground)]">{expiryLabel}</span>
            </span>
          ) : (
            <span className="text-[var(--muted-foreground)]">No expiry</span>
          )}
        </div>
      </CardContent>

      <Separator />

      <CardFooter className="gap-2 pt-4">
        <TooltipProvider>
          <CopyButton value={link.url} feedbackText="Copied!" className="flex-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onQRCode(link)}
                className="flex-1"
              >
                <QrCode size={16} />
                QR Code
              </Button>
            </TooltipTrigger>
            <TooltipContent>Generate QR code for this link</TooltipContent>
          </Tooltip>

          {canDeactivate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDeactivate(link)}
                  className="text-[var(--red)] hover:bg-[var(--red)]/10 hover:text-[var(--red)]"
                >
                  <Trash size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Deactivate this link</TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}
