"use client";

import { useState, useTransition } from 'react';
import { Button } from '@useroutr/ui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { DestType } from '@useroutr/types';

interface CreateRecipientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRecipientDialog({ open, onOpenChange }: CreateRecipientDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [type, setType] = useState<DestType>('BANK_ACCOUNT');
  const [details, setDetails] = useState<Record<string, any>>({});

  const handleTypeChange = (value: DestType) => {
    setType(value);
    setDetails({});
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const res = await fetch('/api/v1/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, details }),
      });
      
      if (res.ok) {
        toast({
          title: "Recipient created",
          description: `${name} has been saved.`,
        });
        onOpenChange(false);
        setName('');
        setType('BANK_ACCOUNT');
        setDetails({});
        // Refetch recipients
        window.dispatchEvent(new CustomEvent('recipients:refetch'));
      } else {
        toast({
          title: "Error",
          description: "Failed to create recipient",
          variant: "destructive",
        });
      }
    });
  };

  const renderDetailsForm = () => {
    switch (type) {
      case 'BANK_ACCOUNT':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="account-number">Account Number</Label>
              <Input id="account-number" placeholder="123456789" />
            </div>
            <div>
              <Label htmlFor="routing-number">Routing Number (optional)</Label>
              <Input id="routing-number" placeholder="021000021" />
            </div>
            <div>
              <Label htmlFor="bank-name">Bank Name</Label>
              <Input id="bank-name" placeholder="Chase Bank" />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" placeholder="US" />
            </div>
          </div>
        );
      case 'CRYPTO_WALLET':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Wallet Address</Label>
              <Input id="address" placeholder="0x..." />
            </div>
            <div>
              <Label htmlFor="network">Network</Label>
              <Select onValueChange={(value) => setDetails(prev => ({...prev, network: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stellar">Stellar</SelectItem>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      // Add more type forms...
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Recipient</DialogTitle>
          <DialogDescription>
            Add a recipient to save for future payouts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="John's Bank Account"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Destination Type</Label>
            <Select value={type} onValueChange={handleTypeChange as any}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_ACCOUNT">Bank Account</SelectItem>
                <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                <SelectItem value="CRYPTO_WALLET">Crypto Wallet</SelectItem>
                <SelectItem value="STELLAR">Stellar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {renderDetailsForm()}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={isPending || !name.trim()}>
            Create Recipient
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

