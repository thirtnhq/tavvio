import { Clock } from "@phosphor-icons/react/dist/ssr";

interface ExpiryBadgeProps {
  expiresAt: string;
}

export function ExpiryBadge({ expiresAt }: ExpiryBadgeProps) {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const isExpired = expiryDate < now;

  const formatExpiryDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm ${
        isExpired
          ? "bg-destructive/10 text-destructive"
          : "bg-muted/50 text-muted-foreground"
      }`}
    >
      <Clock size={14} weight="fill" />
      <span>
        {isExpired ? "Expired" : "Expires"}: {formatExpiryDate(expiryDate)}
      </span>
    </div>
  );
}