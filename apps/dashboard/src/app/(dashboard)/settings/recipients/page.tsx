"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@useroutr/ui";
import { Plus, Search } from "lucide-react";
import { RecipientsTable } from "@/components/recipients/RecipientsTable";
import { CreateRecipientDialog } from "@/components/recipients/CreateRecipientDialog";

export default function RecipientsPage() {
  const recipientsQuery = useQuery({
    queryKey: ["recipients"],
    queryFn: async () => {
      const res = await fetch("/api/v1/recipients");
      if (!res.ok) throw new Error("Failed to fetch recipients");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Recipients
        </h2>
        <div className="flex items-center gap-2">
          <CreateRecipientDialog />
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <RecipientsTable
        data={recipientsQuery.data?.data || []}
        total={recipientsQuery.data?.total || 0}
        isLoading={recipientsQuery.isLoading}
      />
    </div>
  );
}
