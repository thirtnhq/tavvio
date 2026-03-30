import { Clock } from "@phosphor-icons/react/dist/ssr";

interface ExpiryBadgeProps {
  expiresAt: string;
}

export function ExpiryBadge({ expiresAt }: ExpiryBadgeProps) {
  const expiryDate = new Date(expiresAt);
  const formattedDate = expiryDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock size={14} weight="fill" />
      <span>Expires: {formattedDate}</span>
    </div>
  );
}
