import { CopyField } from "@/components/CopyField";

interface BankSession {
  bankName: string;
  accountNumber: string;
  routingNumber?: string | null;
  iban?: string | null;
  bic?: string | null;
  branchCode?: string | null;
  reference: string;
  amount: string;
  currency: string;
  type: "ACH" | "SEPA" | "LOCAL";
}

interface BankDetailsProps {
  session: BankSession;
}

export function BankDetails({ session }: BankDetailsProps) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="space-y-3">
        <CopyField label="Bank" value={session.bankName} />
        <CopyField label="Account" value={session.accountNumber} />

        {session.type === "ACH" && session.routingNumber && (
          <CopyField label="Routing" value={session.routingNumber} />
        )}

        {session.type === "SEPA" && session.iban && (
          <CopyField label="IBAN" value={session.iban} />
        )}

        {session.type === "SEPA" && session.bic && (
          <CopyField label="BIC / SWIFT" value={session.bic} />
        )}

        {session.type === "LOCAL" && session.branchCode && (
          <CopyField label="Branch Code" value={session.branchCode} />
        )}

        <CopyField label="Reference" value={session.reference} />
        <CopyField
          label="Amount"
          value={`${session.amount} ${session.currency}`}
          copyValue={`${session.amount}`}
        />
      </div>
    </div>
  );
}
