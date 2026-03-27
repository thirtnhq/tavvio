import { XCircle, Clock, CheckCircle, Warning } from "@phosphor-icons/react/dist/ssr";

interface LinkErrorProps {
  type: "not-found" | "expired" | "redeemed" | "inactive";
  expiryDate?: string;
}

export function LinkError({ type, expiryDate }: LinkErrorProps) {
  const getErrorContent = () => {
    switch (type) {
      case "not-found":
        return {
          icon: <XCircle size={48} weight="fill" className="text-destructive" />,
          title: "Payment link not found",
          message: "This payment link doesn't exist. Please check the URL.",
        };
      case "expired":
        return {
          icon: <Clock size={48} weight="fill" className="text-destructive" />,
          title: "Payment link expired",
          message: expiryDate
            ? `This payment link expired on ${new Date(expiryDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}. Please contact the merchant for a new link.`
            : "This payment link has expired. Please contact the merchant for a new link.",
        };
      case "redeemed":
        return {
          icon: <CheckCircle size={48} weight="fill" className="text-muted-foreground" />,
          title: "Payment link already used",
          message: "This payment link has already been used and cannot be used again.",
        };
      case "inactive":
        return {
          icon: <Warning size={48} weight="fill" className="text-destructive" />,
          title: "Payment link inactive",
          message: "This payment link is no longer active. Please contact the merchant.",
        };
      default:
        return {
          icon: <XCircle size={48} weight="fill" className="text-destructive" />,
          title: "Something went wrong",
          message: "Unable to load this payment link. Please try again later.",
        };
    }
  };

  const { icon, title, message } = getErrorContent();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="space-y-4">
            <div className="flex justify-center">{icon}</div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}