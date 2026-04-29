"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Payout {
  id: string;
  recipientName: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
}

interface PayoutsTableProps {
  data: Payout[];
  isLoading: boolean;
}

export function PayoutsTable({ data, isLoading }: PayoutsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-6 py-4">
              <div className="h-5 skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((payout) => (
            <TableRow key={payout.id}>
              <TableCell className="font-mono text-xs">{payout.id.slice(-8)}</TableCell>
              <TableCell>{payout.recipientName}</TableCell>
              <TableCell>
                <span className="font-mono">{payout.amount} {payout.currency}</span>
              </TableCell>
              <TableCell>
                <Badge variant={payout.status === 'COMPLETED' ? 'default' : 'secondary'}>
                  {payout.status}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(payout.createdAt), 'MMM dd, yyyy')}</TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No payouts yet. Create your first one!
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

