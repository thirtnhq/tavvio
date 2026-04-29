"use client";

import { Button } from '@useroutr/ui';
import { DialogProps } from '@/components/ui/dialog';

interface DeleteRecipientDialogProps extends DialogProps {
  id: string;
}

export function DeleteRecipientDialog({ id, ...props }: DeleteRecipientDialogProps) {
  return (
    <div>Delete dialog for {id} (TODO: implement)</div>
  );
}

