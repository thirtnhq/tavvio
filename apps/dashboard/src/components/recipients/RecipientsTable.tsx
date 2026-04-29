"use client";

import { useState } from 'react';
import { Button } from '@useroutr/ui';
import { MoreHorizontal, Trash2, Edit3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DestType } from '@useroutr/types';
import { EditRecipientDialog } from './EditRecipientDialog';
import { DeleteRecipientDialog } from './DeleteRecipientDialog';

interface Recipient {
  id: string;
  name: string;
  type: DestType;
  isDefault: boolean;
  createdAt: string;
}

interface RecipientsTableProps {
  data: Recipient[];
  total: number;
  isLoading: boolean;
}

export function RecipientsTable({ data, total, isLoading }: RecipientsTableProps) {
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Recipient[]>([]);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-8 text-center">
          <div className="h-8 w-64 mx-auto skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8">
            Bulk actions
            <span className="ml-1 rounded-sm bg-muted px-2 py-0.5 text-xs font-medium">
              {selected.length}
            </span>
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {total} recipients
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((recipient) => (
              <TableRow key={recipient.id} className="border-b hover:bg-accent/50">
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.some((s) => s.id === recipient.id)}
                    onChange={() => setSelected((prev) =>
                      prev.some((s) => s.id === recipient.id)
                        ? prev.filter((s) => s.id !== recipient.id)
                        : [...prev, recipient]
                    )}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </TableCell>
                <TableCell className="font-medium">{recipient.name}</TableCell>
                <TableCell>
                  <Badge variant={recipient.type === 'BANK_ACCOUNT' ? 'default' : 'secondary'}>
                    {recipient.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {recipient.type === 'BANK_ACCOUNT' && '**** **** 1234'}
                  {recipient.type === 'CRYPTO_WALLET' && '0x...abc'}
                  {recipient.type === 'MOBILE_MONEY' && '+1 (555) 123-4567'}
                  {recipient.type === 'STELLAR' && 'G...'}
                </TableCell>
                <TableCell>
                  {recipient.isDefault && <Badge variant="outline">Default</Badge>}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {new Date(recipient.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditId(recipient.id)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setDeleteId(recipient.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No recipients. <Button variant="link" size="sm" className="h-6 p-0">
                    Create one
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {editId && (
        <EditRecipientDialog 
          id={editId} 
          onClose={() => setEditId(null)} 
        />
      )}
      {deleteId && (
        <DeleteRecipientDialog 
          id={deleteId} 
          onClose={() => setDeleteId(null)} 
        />
      )}
    </div>
  );
}

