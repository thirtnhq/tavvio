import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { cn } from "@useroutr/ui";

interface StatusIndicatorProps {
  status: "processing" | "success" | "error";
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "relative flex h-16 w-16 items-center justify-center rounded-full",
          status === "processing" && "bg-primary/10",
          status === "success" && "bg-green/10",
          status === "error" && "bg-red/10"
        )}
      >
        {status === "processing" && (
          <>
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
          </>
        )}
        {status === "success" && (
          <CheckCircle size={30} weight="fill" className="text-green" />
        )}
        {status === "error" && (
          <XCircle size={30} weight="fill" className="text-red" />
        )}
      </div>
    </div>
  );
}
