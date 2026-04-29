"use client";

import { Button } from '@useroutr/ui';
import { DialogProps } from '@/components/ui/dialog';

interface EditRecipientDialogProps extends DialogProps {
  id: string;
}

export function EditRecipientDialog({ id, ...props }: EditRecipientDialogProps) {
  return (
    <div>Edit dialog for {id} (TODO: implement form)</div>
  );
}

