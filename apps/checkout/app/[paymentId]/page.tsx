import { use } from "react";
import { PaymentPageClient } from "@/components/PaymentPageClient";

export default function PaymentPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = use(params);
  return <PaymentPageClient paymentId={paymentId} />;
}
