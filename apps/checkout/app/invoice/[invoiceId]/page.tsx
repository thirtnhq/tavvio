import { use } from "react";
import { InvoiceCheckoutClient } from "@/components/InvoiceCheckoutClient";

export default function InvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
  return <InvoiceCheckoutClient invoiceId={invoiceId} />;
}
