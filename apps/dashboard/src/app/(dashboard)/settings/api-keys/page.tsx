"use client";

import { useState } from "react";
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
import {
  useApiKeys,
  useGenerateApiKey,
  useRevokeApiKey,
  type ApiKeyItem,
} from "@/hooks/useSettings";
import { formatDate, formatLastUsed } from "@/lib/utils/time";
import { motion } from "framer-motion";
import {
  KeyRound,
  Copy,
  Trash2,
  AlertTriangle,
  TestTube,
  Zap,
  Clock,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" },
  }),
};

export default function ApiKeysPage() {
  const { toast } = useToast();
  const { data: apiKeys, isLoading } = useApiKeys();
  const generateApiKey = useGenerateApiKey();
  const revokeApiKey = useRevokeApiKey();

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [selectedKeyType, setSelectedKeyType] = useState<"live" | "test">(
    "live",
  );
  const [keyName, setKeyName] = useState("");
  const [revokeConfirmText, setRevokeConfirmText] = useState("");
  const [selectedKey, setSelectedKey] = useState<ApiKeyItem | null>(null);
  const [newKey, setNewKey] = useState("");

  const handleGenerateKey = () => {
    if (!keyName.trim()) {
      toast("Please enter a name for the key.", "error");
      return;
    }

    generateApiKey.mutate(
      { mode: selectedKeyType, name: keyName.trim() },
      {
        onSuccess: (data) => {
          setNewKey(data.apiKey);
          setShowGenerateDialog(false);
          setShowNewKeyDialog(true);
          setKeyName("");
        },
        onError: (err) =>
          toast(err.message || "Failed to generate API key.", "error"),
      },
    );
  };

  const handleRevokeKey = () => {
    if (!selectedKey || revokeConfirmText !== "REVOKE") return;

    revokeApiKey.mutate(selectedKey.id, {
      onSuccess: () => {
        setShowRevokeDialog(false);
        setRevokeConfirmText("");
        setSelectedKey(null);
        toast("API key has been revoked.", "success");
      },
      onError: (err) =>
        toast(err.message || "Failed to revoke API key.", "error"),
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Copied to clipboard!", "success");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-1 h-3 w-44" />
            </div>
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10">
            <KeyRound size={20} className="text-amber" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
              API Keys
            </h2>
            <p className="text-xs text-muted-foreground">
              {apiKeys?.length ?? 0} key{(apiKeys?.length ?? 0) !== 1 && "s"}{" "}
              configured
            </p>
          </div>
        </div>
        <Button onClick={() => setShowGenerateDialog(true)}>
          <Zap size={15} />
          Generate Key
        </Button>
      </motion.div>

      {/* Warning */}
      <motion.div
        className="flex items-start gap-3 rounded-2xl border border-amber/20 bg-amber/5 p-4"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={1}
      >
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber" />
        <div>
          <p className="text-sm font-medium text-amber">
            API keys are shown once at creation.
          </p>
          <p className="text-xs text-amber/70">
            Store them securely in your environment variables.
          </p>
        </div>
      </motion.div>

      {/* Key List */}
      {apiKeys && apiKeys.length > 0 ? (
        <div className="space-y-2">
          {apiKeys.map((key, idx) => (
            <motion.div
              key={key.id}
              className="surface flex items-center justify-between p-4"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={idx + 2}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    key.mode === "LIVE"
                      ? "bg-green/10"
                      : "bg-blue/10"
                  }`}
                >
                  {key.mode === "LIVE" ? (
                    <Zap size={16} className="text-green" />
                  ) : (
                    <TestTube size={16} className="text-blue" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {key.name}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                        key.mode === "LIVE"
                          ? "bg-green/10 text-green"
                          : "bg-blue/10 text-blue"
                      }`}
                    >
                      {key.mode}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <code className="font-mono">{key.maskedKey}</code>
                    <span className="hidden sm:inline">
                      Created {formatDate(key.createdAt)}
                    </span>
                    <span className="hidden md:inline-flex items-center gap-1">
                      <Clock size={11} />
                      {formatLastUsed(key.lastUsedAt)}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-destructive hover:text-destructive"
                onClick={() => {
                  setSelectedKey(key);
                  setShowRevokeDialog(true);
                }}
              >
                <Trash2 size={14} />
                Revoke
              </Button>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          className="surface p-10 text-center"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
            <KeyRound size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            No API keys yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Generate a key to start integrating with Useroutr
          </p>
        </motion.div>
      )}

      {/* Sandbox info */}
      <motion.div
        className="surface p-5"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={3}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue/10">
            <TestTube size={16} className="text-blue" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Sandbox Mode
            </h3>
            <p className="text-xs text-muted-foreground">
              Use{" "}
              <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                ur_test_
              </code>{" "}
              keys to test without real money on Stellar testnet
            </p>
          </div>
        </div>
      </motion.div>

      {/* Generate Key Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription>
              Create a named API key for your integration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Key name"
              placeholder="e.g. Production Backend, Staging Server"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Environment
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedKeyType("live")}
                  className={`rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                    selectedKeyType === "live"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/60 hover:border-border hover:bg-secondary/50"
                  }`}
                >
                  <Zap
                    size={18}
                    className={
                      selectedKeyType === "live"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  />
                  <p className="mt-2 font-semibold text-foreground">Live</p>
                  <p className="text-xs text-muted-foreground">
                    For production
                  </p>
                </button>
                <button
                  onClick={() => setSelectedKeyType("test")}
                  className={`rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                    selectedKeyType === "test"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/60 hover:border-border hover:bg-secondary/50"
                  }`}
                >
                  <TestTube
                    size={18}
                    className={
                      selectedKeyType === "test"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  />
                  <p className="mt-2 font-semibold text-foreground">Test</p>
                  <p className="text-xs text-muted-foreground">For sandbox</p>
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleGenerateKey}
              loading={generateApiKey.isPending}
              disabled={!keyName.trim()}
            >
              Generate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
            <DialogDescription>
              Copy this key now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber/20 bg-amber/5 p-4">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-amber"
              />
              <p className="text-xs text-amber">
                This key will only be shown once. Copy it now.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/50 p-3">
              <code className="flex-1 font-mono text-sm text-foreground break-all">
                {newKey}
              </code>
              <button
                onClick={() => copyToClipboard(newKey)}
                className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Key Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              Revoke &ldquo;{selectedKey?.name}&rdquo;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-destructive"
              />
              <p className="text-xs text-destructive">
                Revoking{" "}
                <code className="font-mono">{selectedKey?.maskedKey}</code> will
                immediately break any integration using it. This action cannot
                be undone.
              </p>
            </div>
            <Input
              label='Type "REVOKE" to confirm'
              value={revokeConfirmText}
              onChange={(e) => setRevokeConfirmText(e.target.value)}
              placeholder="REVOKE"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleRevokeKey}
              loading={revokeApiKey.isPending}
              disabled={revokeConfirmText !== "REVOKE"}
            >
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
