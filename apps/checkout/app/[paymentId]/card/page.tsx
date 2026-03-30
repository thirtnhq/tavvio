import { CardPaymentScreen } from "@/components/CardPaymentScreen";

export default async function CardPaymentPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;

  return <CardPaymentScreen paymentId={paymentId} />;
}
