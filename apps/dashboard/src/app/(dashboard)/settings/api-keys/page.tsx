"use client";

import { useState } from "react";
import { Button, Modal, Input, useToast } from "@tavvio/ui";
import { formatDate, formatLastUsed } from "@/lib/utils/time";
import { api } from "@/lib/api";
import { Copy, Eye, EyeSlash, Warning, Trash } from "@phosphor-icons/react";

interface ApiKey {
  id: string;
  key: string;
  name: string;
  type: "live" | "test";
  createdAt: string;
  lastUsedAt: string | null;
}

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: "1",
      key: "ur_live_****...****abc",
      name: "Production Key",
      type: "live",
      createdAt: "2026-03-20T10:00:00Z",
      lastUsedAt: "2026-03-27T15:00:00Z",
    },
    {
      id: "2",
      key: "ur_test_****...****def",
      name: "Test Key",
      type: "test",
      createdAt: "2026-03-18T10:00:00Z",
      lastUsedAt: "2026-03-26T10:00:00Z",
    },
  ]);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [selectedKeyType, setSelectedKeyType] = useState<"live" | "test">(
    "live",
  );
  const [selectedKeyToRevoke, setSelectedKeyToRevoke] = useState<ApiKey | null>(
    null,
  );
  const [revokeConfirmText, setRevokeConfirmText] = useState("");
  const [newKey, setNewKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateKey = async () => {
    setIsLoading(true);
    try {
      const response = await api.post<{ key: string }>("/api-keys", {
        type: selectedKeyType,
      });
      setNewKey(response.key);
      setShowGenerateModal(false);
      setShowNewKeyModal(true);
    } catch {
      toast("Failed to generate API key. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!selectedKeyToRevoke) return;

    const keyPrefix =
      selectedKeyToRevoke.type === "live" ? "ur_live_" : "ur_test_";
    if (revokeConfirmText !== keyPrefix) {
      toast("Please type the key prefix to confirm.", "error");
      return;
    }

    setIsLoading(true);
    try {
      await api.delete(`/api-keys/${selectedKeyToRevoke.id}`);
      setApiKeys((prev) => prev.filter((k) => k.id !== selectedKeyToRevoke.id));
      setShowRevokeModal(false);
      setSelectedKeyToRevoke(null);
      setRevokeConfirmText("");
      toast("API key has been revoked.", "success");
    } catch {
      toast("Failed to revoke API key. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Copied to clipboard!", "success");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            API Keys
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your API keys for integration
          </p>
        </div>
        <Button onClick={() => setShowGenerateModal(true)}>
          + Generate New Key
        </Button>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <Warning
          size={20}
          className="mt-0.5 shrink-0 text-amber-500"
          weight="fill"
        />
        <div>
          <p className="font-medium text-amber-500">
            API keys are shown once at creation.
          </p>
          <p className="text-sm text-amber-500/80">Store them securely.</p>
        </div>
      </div>

      {/* API Keys list */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="divide-y divide-border">
          {apiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm text-foreground">
                    {apiKey.key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(apiKey.key)}
                    disabled={apiKey.key.includes("****")}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      apiKey.key.includes("****")
                        ? "Cannot copy masked key"
                        : "Copy to clipboard"
                    }
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span
                    className={
                      apiKey.type === "live"
                        ? "text-green-500"
                        : "text-blue-500"
                    }
                  >
                    {apiKey.type === "live" ? "Live key" : "Test key"}
                  </span>
                  <span>Created: {formatDate(apiKey.createdAt)}</span>
                  <span>Last used: {formatLastUsed(apiKey.lastUsedAt)}</span>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setSelectedKeyToRevoke(apiKey);
                  setSelectedKeyType(apiKey.type);
                  setShowRevokeModal(true);
                }}
              >
                <Trash size={16} />
                Revoke
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Sandbox info */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="font-medium text-foreground">Sandbox Mode</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Use <code className="font-mono text-foreground">ur_test_</code> keys
          to test without real money. Sandbox payments settle on Stellar
          testnet.
        </p>
      </div>

      {/* Generate Key Modal */}
      <Modal
        open={showGenerateModal}
        onOpenChange={setShowGenerateModal}
        title="Generate New API Key"
        description="Select the type of API key you want to generate"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowGenerateModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleGenerateKey} loading={isLoading}>
              Generate Key
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Key Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedKeyType("live")}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedKeyType === "live"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-secondary/50"
                }`}
              >
                <p className="font-medium text-foreground">Live Key</p>
                <p className="text-sm text-muted-foreground">
                  For production use
                </p>
              </button>
              <button
                onClick={() => setSelectedKeyType("test")}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedKeyType === "test"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-secondary/50"
                }`}
              >
                <p className="font-medium text-foreground">Test Key</p>
                <p className="text-sm text-muted-foreground">
                  For sandbox testing
                </p>
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate a new {selectedKeyType} API key?
          </p>
        </div>
      </Modal>

      {/* New Key Modal */}
      <Modal
        open={showNewKeyModal}
        onOpenChange={setShowNewKeyModal}
        title="API Key Generated"
        description="Copy this key now. It will not be shown again."
        footer={
          <div className="flex justify-end">
            <Button onClick={() => setShowNewKeyModal(false)}>Done</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <Warning
              size={20}
              className="mt-0.5 shrink-0 text-amber-500"
              weight="fill"
            />
            <p className="text-sm text-amber-500">
              This key will only be shown once. Copy it now.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary p-3">
            <code className="flex-1 font-mono text-sm text-foreground break-all">
              {newKey}
            </code>
            <button
              onClick={() => copyToClipboard(newKey)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy size={18} />
            </button>
          </div>
        </div>
      </Modal>

      {/* Revoke Key Modal */}
      <Modal
        open={showRevokeModal}
        onOpenChange={setShowRevokeModal}
        title="Revoke API Key"
        description="This action cannot be undone"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRevokeModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeKey}
              loading={isLoading}
              disabled={
                revokeConfirmText !==
                (selectedKeyToRevoke?.type === "live" ? "ur_live_" : "ur_test_")
              }
            >
              Revoke Key
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <Warning
              size={20}
              className="mt-0.5 shrink-0 text-destructive"
              weight="fill"
            />
            <p className="text-sm text-destructive">
              Revoke this API key? Any integration using this key will
              immediately stop working.
            </p>
          </div>
          <Input
            label={`Type "${selectedKeyType === "live" ? "ur_live_" : "ur_test_"}" to confirm`}
            value={revokeConfirmText}
            onChange={(e) => setRevokeConfirmText(e.target.value)}
            placeholder={selectedKeyType === "live" ? "ur_live_" : "ur_test_"}
          />
        </div>
      </Modal>
    </div>
  );
}
