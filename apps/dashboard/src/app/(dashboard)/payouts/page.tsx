"use client";

import { useQuery } from '@tanstack/react-query';
import { Button } from '@useroutr/ui';
import { Plus } from 'lucide-react';
import { RecipientsTable } from '@/components/recipients/RecipientsTable';
import { CreatePayoutDialog } from '@/components/payouts/CreatePayoutDialog';
import { PayoutsTable } from '@/components/payouts/PayoutsTable';

export default function PayoutsPage() {
  const payoutsQuery = useQuery({
    queryKey: ['payouts'],
    queryFn: async () => {
      const res = await fetch('/api/v1/payouts');
      if (!res.ok) throw new Error('Failed to fetch payouts');
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Payouts
        </h2>
        <CreatePayoutDialog />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {["Available balance", "Pending", "Total paid out"].map((label) => (
          <div key={label} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="mt-2 h-8 w-28 skeleton" />
          </div>
        ))}
      </div>

      <PayoutsTable data={payoutsQuery.data?.data || []} isLoading={payoutsQuery.isLoading} />
    </div>
  );
}

