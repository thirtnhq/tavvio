"use client";

import { useQuery } from '@tanstack/react-query';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Recipient } from '@useroutr/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function RecipientSelect({
  value,
  onValueChange,
  placeholder = "Select recipient...",
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const recipientsQuery = useQuery({
    queryKey: ['recipients'],
    queryFn: async () => {
      const res = await fetch('/api/v1/recipients?limit=20');
      if (!res.ok) throw new Error('Failed to fetch recipients');
      return (await res.json()) as { data: Recipient[] };
    },
  });

  const selectedRecipient = recipientsQuery.data?.data.find(r => r.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedRecipient ? (
            <div className="flex items-center gap-2 truncate">
              <Badge className="capitalize">{selectedRecipient.type}</Badge>
              {selectedRecipient.name}
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search recipients..." />
          <CommandEmpty>No recipients found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {recipientsQuery.isLoading ? (
                <CommandItem>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </CommandItem>
              ) : (
                recipientsQuery.data?.data.map((recipient) => (
                  <CommandItem
                    key={recipient.id}
                    value={recipient.id}
                    onSelect={() => {
                      onValueChange(recipient.id === value ? '' : recipient.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === recipient.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{recipient.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {recipient.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

