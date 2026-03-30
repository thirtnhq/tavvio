import { ConfirmStatusCard } from "@/components/ConfirmStatusCard";

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;

  return <ConfirmStatusCard paymentId={paymentId} />;
}
