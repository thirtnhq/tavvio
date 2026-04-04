"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
  useToast,
} from "@useroutr/ui";
import { formatTimestamp } from "@/lib/utils/time";
import {
  useWebhookConfig,
  useUpdateWebhook,
  useRegisterWebhook,
  useWebhookLogs,
  useRetryWebhookDelivery,
  type WebhookLog,
} from "@/hooks/useSettings";
import { motion } from "framer-motion";
import {
  Webhook,
  Copy,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Link,
  Radio,
  Lock,
  Clock,
} from "lucide-react";

const AVAILABLE_EVENTS = [
  "payment.completed",
  "payment.failed",
  "payout.completed",
  "payout.failed",
  "invoice.paid",
  "invoice.overdue",
  "refund.created",
  "refund.completed",
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" },
  }),
};

export default function WebhooksPage() {
  const { toast } = useToast();

  const { data: config, isLoading: isLoadingConfig } = useWebhookConfig();
  const updateWebhook = useUpdateWebhook();
  const registerWebhook = useRegisterWebhook();
  const { data: logsData, isLoading: isLoadingLogs } = useWebhookLogs({
    limit: 20,
  });
  const retryDelivery = useRetryWebhookDelivery();

  const [endpointUrl, setEndpointUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [showSecret, setShowSecret] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookLog | null>(
    null,
  );

  const isConfigured = !!config?.webhookUrl;

  useEffect(() => {
    if (config) {
      setEndpointUrl(config.webhookUrl ?? "");
      setSelectedEvents(config.subscribedEvents ?? []);
    }
  }, [config]);

  const handleSaveEndpoint = () => {
    if (!endpointUrl.trim()) {
      toast("Please enter a webhook URL.", "error");
      return;
    }

    if (isConfigured) {
      updateWebhook.mutate(
        { webhookUrl: endpointUrl },
        {
          onSuccess: () => toast("Webhook endpoint saved.", "success"),
          onError: (err) =>
            toast(err.message || "Failed to save endpoint.", "error"),
        },
      );
    } else {
      registerWebhook.mutate(
        { webhookUrl: endpointUrl, subscribedEvents: selectedEvents },
        {
          onSuccess: () => toast("Webhook registered.", "success"),
          onError: (err) =>
            toast(err.message || "Failed to register webhook.", "error"),
        },
      );
    }
  };

  const handleSaveEvents = () => {
    updateWebhook.mutate(
      { subscribedEvents: selectedEvents },
      {
        onSuccess: () => toast("Webhook events saved.", "success"),
        onError: (err) =>
          toast(err.message || "Failed to save events.", "error"),
      },
    );
  };

  const handleRetryDelivery = (id: string) => {
    retryDelivery.mutate(id, {
      onSuccess: () => toast("Webhook delivery retried.", "success"),
      onError: (err) =>
        toast(err.message || "Failed to retry delivery.", "error"),
    });
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((e) => e !== eventId)
        : [...prev, eventId],
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Copied to clipboard!", "success");
  };

  const deliveries = logsData?.data ?? [];
  const isSavingEndpoint = updateWebhook.isPending || registerWebhook.isPending;

  if (isLoadingConfig) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Endpoint URL */}
      <motion.div
        className="surface p-6"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/10">
            <Link size={18} className="text-teal" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Endpoint URL</h3>
            <p className="text-xs text-muted-foreground">
              We&apos;ll send POST requests to this URL when events occur
            </p>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <Input
            placeholder="https://yourapp.com/webhooks/useroutr"
            value={endpointUrl}
            onChange={(e) => setEndpointUrl(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSaveEndpoint} loading={isSavingEndpoint}>
            {isConfigured ? "Save" : "Register"}
          </Button>
        </div>
      </motion.div>

      {/* Events */}
      <motion.div
        className="surface p-6"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={1}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple/10">
            <Radio size={18} className="text-purple" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Events</h3>
            <p className="text-xs text-muted-foreground">
              Select which events you want to receive
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {AVAILABLE_EVENTS.map((event) => {
            const isSelected = selectedEvents.includes(event);
            return (
              <label
                key={event}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
                  isSelected
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/60 hover:border-border hover:bg-secondary/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleEvent(event)}
                  className="h-4 w-4 rounded border-input text-primary accent-primary"
                />
                <code className="font-mono text-xs text-foreground">
                  {event}
                </code>
              </label>
            );
          })}
        </div>
        <div className="mt-5">
          <Button
            onClick={handleSaveEvents}
            loading={updateWebhook.isPending}
            disabled={!isConfigured}
          >
            Save Events
          </Button>
        </div>
      </motion.div>

      {/* Signing Secret */}
      {isConfigured && config?.webhookSecret && (
        <motion.div
          className="surface p-6"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber/10">
              <Lock size={18} className="text-amber" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Signing Secret</h3>
              <p className="text-xs text-muted-foreground">
                Use this secret to verify webhook signatures
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3">
              <code className="flex-1 font-mono text-xs text-foreground">
                {showSecret
                  ? config.webhookSecret
                  : "whsec_" + "•".repeat(32)}
              </code>
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              >
                {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                onClick={() => copyToClipboard(config.webhookSecret!)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              >
                <Copy size={15} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Deliveries */}
      <motion.div
        className="surface overflow-hidden"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={3}
      >
        <div className="flex items-center gap-3 p-5 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue/10">
            <Clock size={18} className="text-blue" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Recent Deliveries
            </h3>
            <p className="text-xs text-muted-foreground">
              {deliveries.length} deliveries
            </p>
          </div>
        </div>

        {isLoadingLogs ? (
          <div className="space-y-0 divide-y divide-border/60">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : deliveries.length > 0 ? (
          <div className="divide-y divide-border/60">
            {deliveries.map((delivery) => {
              const isSuccess = delivery.status === "DELIVERED";
              const isFailed =
                delivery.status === "FAILED" ||
                delivery.status === "EXHAUSTED";

              return (
                <div
                  key={delivery.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isSuccess ? (
                      <CheckCircle2
                        size={16}
                        className="shrink-0 text-green"
                      />
                    ) : isFailed ? (
                      <XCircle size={16} className="shrink-0 text-red" />
                    ) : (
                      <Clock
                        size={16}
                        className="shrink-0 text-amber"
                      />
                    )}
                    <code className="font-mono text-xs text-foreground">
                      {delivery.eventType}
                    </code>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {formatTimestamp(delivery.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDelivery(delivery);
                        setShowDeliveryDialog(true);
                      }}
                    >
                      View
                    </Button>
                    {isFailed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRetryDelivery(delivery.id)}
                        loading={retryDelivery.isPending}
                      >
                        <RotateCcw size={13} />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
              <Webhook size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No deliveries yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Deliveries will appear here once events are triggered
            </p>
          </div>
        )}
      </motion.div>

      {/* Delivery Details Dialog */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
            <DialogDescription>
              {selectedDelivery?.eventType}
            </DialogDescription>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-secondary/50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Event
                  </p>
                  <code className="mt-1 block font-mono text-xs text-foreground">
                    {selectedDelivery.eventType}
                  </code>
                </div>
                <div className="rounded-xl bg-secondary/50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </p>
                  <span
                    className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                      selectedDelivery.status === "DELIVERED"
                        ? "text-green"
                        : selectedDelivery.status === "FAILED" ||
                            selectedDelivery.status === "EXHAUSTED"
                          ? "text-red"
                          : "text-amber"
                    }`}
                  >
                    {selectedDelivery.status === "DELIVERED" ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <XCircle size={13} />
                    )}
                    {selectedDelivery.status}
                  </span>
                </div>
                <div className="rounded-xl bg-secondary/50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Created
                  </p>
                  <p className="mt-1 text-xs text-foreground">
                    {new Date(selectedDelivery.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl bg-secondary/50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Attempts
                  </p>
                  <p className="mt-1 text-xs text-foreground">
                    {selectedDelivery.attempts}
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Payload
                </p>
                <pre className="rounded-xl bg-secondary/50 p-3 text-xs text-foreground overflow-auto max-h-48 font-mono">
                  {JSON.stringify(selectedDelivery.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
