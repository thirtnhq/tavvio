"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Input,
  Select,
  EmptyState,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@tavvio/ui";
import { Plus, MagnifyingGlass, Link as LinkIcon } from "@phosphor-icons/react";
import { useToast } from "@tavvio/ui";
import { LinkCard } from "@/components/links/LinkCard";
import { CreateLinkModal } from "@/components/links/CreateLinkModal";
import { LinkCreatedModal } from "@/components/links/LinkCreatedModal";
import { QRCodeModal } from "@/components/links/QRCodeModal";
import {
  usePaymentLinks,
  useCreatePaymentLink,
  useDeactivatePaymentLink,
} from "@/hooks/usePaymentLinks";
import { useDashboardSocket } from "@/hooks/useDashboardSocket";
import type { PaymentLink, CreatePaymentLinkInput } from "@tavvio/types";

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function LinkCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-7 w-24" />
      <Skeleton className="mt-3 h-4 w-full" />
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="mt-4 flex gap-2 border-t border-[var(--border)] pt-4">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );
}

export default function PaymentLinksPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createdLink, setCreatedLink] = useState<PaymentLink | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedLinkForQR, setSelectedLinkForQR] = useState<PaymentLink | null>(null);
  const [linkToDeactivate, setLinkToDeactivate] = useState<PaymentLink | null>(null);

  // Debounce search input (300ms)
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, refetch } = usePaymentLinks({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: debouncedSearch || undefined,
  });

  const createMutation = useCreatePaymentLink();
  const deactivateMutation = useDeactivatePaymentLink();

  // WebSocket for real-time payment notifications
  const { subscribe } = useDashboardSocket();

  useEffect(() => {
    // Subscribe to payment link payment events
    const unsubscribe = subscribe("payment-link.payment", (...args: unknown[]) => {
      const payload = args[0] as { linkId: string; amount: number };
      toast(`Payment received: $${payload.amount}`, "success");
      refetch();
    });

    return () => unsubscribe();
  }, [subscribe, toast, refetch]);

  const handleCreate = (data: CreatePaymentLinkInput) => {
    createMutation.mutate(data, {
      onSuccess: (newLink) => {
        setCreatedLink(newLink);
        setIsCreateModalOpen(false);
        toast("Payment link created successfully!", "success");
      },
      onError: (error) => {
        toast(`Failed to create link: ${error.message}`, "error");
      },
    });
  };

  const handleDeactivate = (link: PaymentLink) => {
    setLinkToDeactivate(link);
  };

  const confirmDeactivate = () => {
    if (!linkToDeactivate) return;

    deactivateMutation.mutate(linkToDeactivate.id, {
      onSuccess: () => {
        toast("Link deactivated successfully", "success");
        setLinkToDeactivate(null);
      },
      onError: (error) => {
        toast(`Failed to deactivate: ${error.message}`, "error");
      },
    });
  };

  const handleQRCode = (link: PaymentLink) => {
    setSelectedLinkForQR(link);
    setIsQRModalOpen(true);
  };

  const links = data?.data ?? [];
  const hasLinks = links.length > 0;

  // Determine if filters are active
  const hasActiveFilters = debouncedSearch.length > 0 || statusFilter !== "all";

  // Show empty state for "no links" vs "no results"
  const showNoResults = hasActiveFilters && !hasLinks;
  const showNoLinks = !hasActiveFilters && !hasLinks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Payment Links
        </h2>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} />
          New Link
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
          />
          <Input
            placeholder="Search links..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={[
            { value: "all", label: "All Statuses" },
            { value: "active", label: "Active" },
            { value: "expired", label: "Expired" },
            { value: "deactivated", label: "Deactivated" },
          ]}
          className="w-full sm:w-auto"
        />
      </div>

      {/* Links Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <LinkCardSkeleton key={i} />
          ))}
        </div>
      ) : hasLinks ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {links.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              onQRCode={handleQRCode}
              onDeactivate={handleDeactivate}
            />
          ))}
        </div>
      ) : showNoResults ? (
        <EmptyState
          icon={LinkIcon}
          title="No links match your filters"
          description="Try adjusting your search or filter criteria"
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : showNoLinks ? (
        <EmptyState
          icon={LinkIcon}
          title="No payment links yet"
          description="Create your first payment link to start accepting payments"
          action={
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={18} />
              Create Link
            </Button>
          }
        />
      ) : null}

      {/* Create Link Modal */}
      <CreateLinkModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreate={handleCreate}
        isLoading={createMutation.isPending}
      />

      {/* Link Created Modal */}
      {createdLink && (
        <LinkCreatedModal
          open={!!createdLink}
          onOpenChange={(open) => {
            if (!open) setCreatedLink(null);
          }}
          linkUrl={createdLink.url}
          linkName={createdLink.description || "Payment Link"}
        />
      )}

      {/* QR Code Modal */}
      {selectedLinkForQR && (
        <QRCodeModal
          open={isQRModalOpen}
          onOpenChange={setIsQRModalOpen}
          url={selectedLinkForQR.url}
          linkName={selectedLinkForQR.description || "Payment Link"}
        />
      )}

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={!!linkToDeactivate}
        onOpenChange={(open) => {
          if (!open) setLinkToDeactivate(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate Link</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this payment link? No more payments will be accepted.
            </DialogDescription>
          </DialogHeader>

          {linkToDeactivate && (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="font-medium text-[var(--foreground)]">
                {linkToDeactivate.description || linkToDeactivate.id}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {linkToDeactivate.url}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLinkToDeactivate(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeactivate}
              loading={deactivateMutation.isPending}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
