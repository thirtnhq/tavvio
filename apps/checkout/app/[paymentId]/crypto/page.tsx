import { OrderSummary } from "@/components/OrderSummary";
import { CryptoPayment } from "@/components/CryptoPayment";
import { QuoteCountdown } from "@/components/QuoteCountdown";
import { TrustBadges } from "@/components/TrustBadges";
import { MerchantBranding } from "@/components/MerchantBranding";
import { usePayment } from "@/hooks/usePayment";
import { useParams } from "next/navigation";

export default function CryptoPaymentPage() {
  const params = useParams();
  const paymentId = params.paymentId as string;
  const { data: payment } = usePayment(paymentId);

  const handleQuoteExpired = () => {
    // In a real implementation, this would trigger a quote refresh
    console.log("Quote expired, need to refresh");
  };

  if (!payment) {
    return (
      <div className="flex min-h-screen justify-center items-center bg-muted/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-muted/30 px-4 py-8 sm:px-8">
      <div className="w-full max-w-[460px] space-y-6">
        <MerchantBranding />
        <OrderSummary compact />
        <QuoteCountdown 
          expiresAt={payment.expiresAt} 
          onExpired={handleQuoteExpired} 
        />
        <CryptoPayment 
          paymentId={paymentId}
          merchantAmount={payment.amount}
          merchantCurrency={payment.currency}
        />
        <TrustBadges />
      </div>
    </div>
  );
}
