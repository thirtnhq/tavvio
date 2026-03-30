import { Warning, XCircle, Clock, Lock } from "@phosphor-icons/react/dist/ssr";

interface LinkErrorProps {
  type: "not-found" | "expired" | "redeemed" | "inactive";
  expiresAt?: string;
}

export function LinkError({ type, expiresAt }: LinkErrorProps) {
  const errorConfig = {
    "not-found": {
      icon: <XCircle size={48} weight="fill" className="text-destructive" />,
      title: "Link Not Found",
      message: "This payment link doesn't exist. Please check the URL.",
    },
    expired: {
      icon: <Clock size={48} weight="fill" className="text-destructive" />,
      title: "Link Expired",
      message: expiresAt
        ? `This payment link expired on ${new Date(expiresAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}. Please contact the merchant for a new link.`
        : "This payment link has expired. Please contact the merchant for a new link.",
    },
    redeemed: {
      icon: <Warning size={48} weight="fill" className="text-destructive" />,
      title: "Already Used",
      message: "This payment link has already been used.",
    },
    inactive: {
      icon: <Lock size={48} weight="fill" className="text-destructive" />,
      title: "Link Inactive",
      message: "This payment link is no longer active.",
    },
  };

  const config = errorConfig[type];

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-[460px] text-center">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mx-auto mb-4">{config.icon}</div>
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            {config.title}
          </h1>
          <p className="text-sm text-muted-foreground">{config.message}</p>
        </div>
      </div>
    </div>
  );
}
