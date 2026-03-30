"use client";

import { useState } from "react";
import { Button, Input, Modal, useToast } from "@tavvio/ui";
import { formatTimestamp } from "@/lib/utils/time";
import { api } from "@/lib/api";
import {
  Copy,
  Eye,
  EyeSlash,
  ArrowClockwise,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";

interface WebhookDelivery {
  id: string;
  event: string;
  statusCode: number;
  timestamp: string;
  success: boolean;
}

interface WebhookConfig {
  endpointUrl: string;
  events: string[];
  signingSecret: string;
}

const AVAILABLE_EVENTS = [
  { id: "payment.completed", label: "payment.completed" },
  { id: "payment.failed", label: "payment.failed" },
  { id: "payout.completed", label: "payout.completed" },
  { id: "payout.failed", label: "payout.failed" },
  { id: "invoice.paid", label: "invoice.paid" },
  { id: "invoice.overdue", label: "invoice.overdue" },
  { id: "refund.created", label: "refund.created" },
  { id: "refund.completed", label: "refund.completed" },
];

export default function WebhooksPage() {
  const { toast } = useToast();
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    endpointUrl: "https://yourapp.com/webhooks/useroutr",
    events: [
      "payment.completed",
      "payment.failed",
      "payout.completed",
      "invoice.paid",
    ],
    signingSecret: "whsec_****...****xyz",
  });

  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([
    {
      id: "1",
      event: "payment.completed",
      statusCode: 200,
      timestamp: "2026-03-27T15:28:00Z",
      success: true,
    },
    {
      id: "2",
      event: "payment.completed",
      statusCode: 500,
      timestamp: "2026-03-27T15:23:00Z",
      success: false,
    },
    {
      id: "3",
      event: "payout.completed",
      statusCode: 200,
      timestamp: "2026-03-27T14:28:00Z",
      success: true,
    },
  ]);

  const [showSecret, setShowSecret] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] =
    useState<WebhookDelivery | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveEndpoint = async () => {
    setIsLoading(true);
    try {
      await api.patch("/webhooks/config", {
        endpointUrl: webhookConfig.endpointUrl,
      });
      toast("Webhook endpoint saved.", "success");
    } catch {
      toast("Failed to save webhook endpoint.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEvents = async () => {
    setIsLoading(true);
    try {
      await api.patch("/webhooks/config", {
        events: webhookConfig.events,
      });
      toast("Webhook events saved.", "success");
    } catch {
      toast("Failed to save webhook events.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateSecret = async () => {
    setIsLoading(true);
    try {
      const response = await api.post<{ secret: string }>(
        "/webhooks/regenerate-secret",
      );
      setWebhookConfig((prev) => ({ ...prev, signingSecret: response.secret }));
      setShowRegenerateModal(false);
      toast("Signing secret regenerated.", "success");
    } catch {
      toast("Failed to regenerate signing secret.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryDelivery = async (deliveryId: string) => {
    try {
      await api.post(`/webhooks/deliveries/${deliveryId}/retry`);
      toast("Webhook delivery retried.", "success");
    } catch {
      toast("Failed to retry webhook delivery.", "error");
    }
  };

  const toggleEvent = (eventId: string) => {
    setWebhookConfig((prev) => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Copied to clipboard!", "success");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Webhooks
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure webhook endpoints for real-time events
        </p>
      </div>

      {/* Endpoint URL */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="font-medium text-foreground">Endpoint URL</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll send POST requests to this URL when events occur
        </p>
        <div className="mt-4 flex gap-3">
          <Input
            placeholder="https://yourapp.com/webhooks/useroutr"
            value={webhookConfig.endpointUrl}
            onChange={(e) =>
              setWebhookConfig((prev) => ({
                ...prev,
                endpointUrl: e.target.value,
              }))
            }
            className="flex-1"
          />
          <Button onClick={handleSaveEndpoint} loading={isLoading}>
            Save
          </Button>
        </div>
      </div>

      {/* Events */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="font-medium text-foreground">Events</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Select which events you want to receive
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {AVAILABLE_EVENTS.map((event) => (
            <label
              key={event.id}
              className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={webhookConfig.events.includes(event.id)}
                onChange={() => toggleEvent(event.id)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <code className="font-mono text-sm text-foreground">
                {event.label}
              </code>
            </label>
          ))}
        </div>
        <div className="mt-4">
          <Button onClick={handleSaveEvents} loading={isLoading}>
            Save Events
          </Button>
        </div>
      </div>

      {/* Signing Secret */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="font-medium text-foreground">Signing Secret</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Use this secret to verify webhook signatures
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-secondary p-3">
            <code className="flex-1 font-mono text-sm text-foreground">
              {showSecret
                ? webhookConfig.signingSecret
                : "whsec_****...****xyz"}
            </code>
            <button
              onClick={() => setShowSecret(!showSecret)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {showSecret ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={() => copyToClipboard(webhookConfig.signingSecret)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy size={18} />
            </button>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowRegenerateModal(true)}
          >
            <ArrowClockwise size={16} />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-medium text-foreground">Recent Deliveries</h3>
        </div>
        <div className="divide-y divide-border">
          {deliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-4">
                <code className="font-mono text-sm text-foreground">
                  {delivery.event}
                </code>
                <span
                  className={`flex items-center gap-1 text-sm ${
                    delivery.success ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {delivery.success ? (
                    <CheckCircle size={16} weight="fill" />
                  ) : (
                    <XCircle size={16} weight="fill" />
                  )}
                  {delivery.statusCode}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatTimestamp(delivery.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedDelivery(delivery);
                    setShowDeliveryModal(true);
                  }}
                >
                  View
                </Button>
                {!delivery.success && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetryDelivery(delivery.id)}
                  >
                    <ArrowClockwise size={14} />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regenerate Secret Modal */}
      <Modal
        open={showRegenerateModal}
        onOpenChange={setShowRegenerateModal}
        title="Regenerate Signing Secret"
        description="This will invalidate your current secret"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowRegenerateModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRegenerateSecret} loading={isLoading}>
              Regenerate
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to regenerate the signing secret? Your current
          secret will be invalidated immediately and you'll need to update your
          integration.
        </p>
      </Modal>

      {/* Delivery Details Modal */}
      <Modal
        open={showDeliveryModal}
        onOpenChange={setShowDeliveryModal}
        title="Delivery Details"
        description={selectedDelivery?.event}
        footer={
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeliveryModal(false)}
            >
              Close
            </Button>
          </div>
        }
      >
        {selectedDelivery && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Event</p>
                <code className="font-mono text-sm text-foreground">
                  {selectedDelivery.event}
                </code>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span
                  className={`flex items-center gap-1 text-sm ${
                    selectedDelivery.success ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {selectedDelivery.success ? (
                    <CheckCircle size={16} weight="fill" />
                  ) : (
                    <XCircle size={16} weight="fill" />
                  )}
                  {selectedDelivery.statusCode}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Timestamp</p>
                <p className="text-sm text-foreground">
                  {new Date(selectedDelivery.timestamp).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivery ID</p>
                <code className="font-mono text-sm text-foreground">
                  {selectedDelivery.id}
                </code>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Response Body</p>
              <pre className="mt-1 rounded-lg bg-secondary p-3 text-sm text-foreground overflow-auto">
                {selectedDelivery.success
                  ? '{"status": "ok"}'
                  : '{"error": "Internal Server Error"}'}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
