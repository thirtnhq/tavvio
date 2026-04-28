"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Pencil,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@useroutr/ui";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useDashboardSocket } from "@/hooks/useDashboardSocket";

const REQUIRED_HEADERS = [
  "recipient_name",
  "destination_type",
  "account_details",
  "amount",
  "currency",
] as const;

const SUPPORTED_BANK_COUNTRIES = ["US", "GB", "NG", "KE", "GH", "ZA"];
const SUPPORTED_MOBILE_COUNTRIES = ["NG", "KE", "GH", "ZA", "UG", "TZ", "RW"];
const TWO_FACTOR_ENABLED = true;
const FEE_RATE = 0.012;

type DestinationType = "BANK_ACCOUNT" | "MOBILE_MONEY" | "CRYPTO_WALLET" | "STELLAR";
type ValidationStatus = "valid" | "error";
type PayoutStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

interface EditableRow {
  id: string;
  rowNumber: number;
  recipient_name: string;
  destination_type: string;
  account_details: string;
  amount: string;
  currency: string;
  status: ValidationStatus;
  errors: string[];
}

interface PayoutPayload {
  recipientName: string;
  destinationType: DestinationType;
  destination: Record<string, string>;
  amount: string;
  currency: string;
}

interface BulkPayoutResult {
  batchId: string;
  total: number;
  accepted: number;
  rejected: number;
  payouts: Array<{ index: number; payoutId?: string; error?: string }>;
}

interface PayoutListItem {
  id: string;
  recipientName: string;
  destinationType: DestinationType;
  amount: string;
  currency: string;
  status: PayoutStatus;
  failureReason?: string | null;
  batchId?: string | null;
}

interface PayoutsResponse {
  data: PayoutListItem[];
  total: number;
}

interface ProgressRecipient {
  rowId: string;
  payoutId?: string;
  recipientName: string;
  amount: string;
  currency: string;
  status: PayoutStatus;
  failureReason?: string;
}

interface SocketEnvelope {
  event?: string;
  data?: {
    payoutId?: string;
    status?: PayoutStatus;
    failureReason?: string;
  };
}

const templateCsv = `${REQUIRED_HEADERS.join(",")}
Amina Bello,BANK_ACCOUNT,"accountNumber=1234567890;bankName=Kuda;country=NG",2500,NGN
Kwame Mensah,MOBILE_MONEY,"phoneNumber=+233241234567;provider=MTN;country=GH",450,GHS
Nova Labs,STELLAR,"address=GBZXN7PIRZGNMHGAQXUKYOOSHLJXBS5M4NUJ2S7NGW3MY6RIM7E6WYOG;asset=native",75,USD`;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(current.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parseAccountDetails(value: string): Record<string, string> {
  const trimmed = value.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, item]) => [key, String(item)])
    );
  } catch {
    return Object.fromEntries(
      trimmed
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const [key, ...rest] = part.split("=");
          return [key.trim(), rest.join("=").trim()];
        })
        .filter(([key, item]) => key && item)
    );
  }
}

function normalizeDestinationType(value: string): DestinationType | null {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (["BANK_ACCOUNT", "MOBILE_MONEY", "CRYPTO_WALLET", "STELLAR"].includes(normalized)) {
    return normalized as DestinationType;
  }
  return null;
}

function validateRow(row: Omit<EditableRow, "status" | "errors">): EditableRow {
  const errors: string[] = [];
  const destinationType = normalizeDestinationType(row.destination_type);
  const details = parseAccountDetails(row.account_details);
  const amount = Number(row.amount);
  const currency = row.currency.trim().toUpperCase();

  if (!row.recipient_name.trim()) errors.push("Recipient name is required");
  if (!destinationType) errors.push("Unsupported destination type");
  if (!Number.isFinite(amount) || amount <= 0) errors.push("Amount must be greater than 0");
  if (!/^[A-Z]{3}$/.test(currency)) errors.push("Currency must be a 3-letter code");

  if (destinationType === "BANK_ACCOUNT") {
    const country = details.country?.toUpperCase();
    if (!country || !SUPPORTED_BANK_COUNTRIES.includes(country)) {
      errors.push("Unsupported country for bank payout");
    }
    if (!/^\d{6,20}$/.test(details.accountNumber ?? "")) {
      errors.push("Invalid account number");
    }
  }

  if (destinationType === "MOBILE_MONEY") {
    const country = details.country?.toUpperCase();
    if (!country || !SUPPORTED_MOBILE_COUNTRIES.includes(country)) {
      errors.push("Unsupported country for mobile money");
    }
    if (!/^\+?\d{7,15}$/.test(details.phoneNumber ?? "")) {
      errors.push("Invalid mobile money phone number");
    }
    if (!details.provider) errors.push("Mobile money provider is required");
  }

  if (destinationType === "CRYPTO_WALLET") {
    if (!details.address || details.address.length < 12) errors.push("Invalid wallet address");
    if (!details.network) errors.push("Wallet network is required");
  }

  if (destinationType === "STELLAR") {
    if (!/^G[A-Z2-7]{55}$/.test(details.address ?? "")) {
      errors.push("Invalid Stellar account");
    }
  }

  return {
    ...row,
    destination_type: destinationType ?? row.destination_type,
    currency,
    status: errors.length ? "error" : "valid",
    errors,
  };
}

function rowToPayout(row: EditableRow): PayoutPayload {
  const destinationType = normalizeDestinationType(row.destination_type) as DestinationType;
  const details = parseAccountDetails(row.account_details);

  return {
    recipientName: row.recipient_name.trim(),
    destinationType,
    destination: {
      ...details,
      type: destinationType,
      ...(destinationType === "BANK_ACCOUNT" || destinationType === "MOBILE_MONEY"
        ? { country: details.country.toUpperCase() }
        : {}),
      ...(destinationType === "STELLAR" && !details.asset ? { asset: "native" } : {}),
      ...(destinationType === "CRYPTO_WALLET" && !details.asset
        ? { asset: row.currency.trim().toUpperCase() }
        : {}),
    },
    amount: Number(row.amount).toFixed(2),
    currency: row.currency.trim().toUpperCase(),
  };
}

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTotals(totals: Record<string, number>) {
  const entries = Object.entries(totals).filter(([, amount]) => amount > 0);
  if (!entries.length) return formatMoney(0, "USD");
  return entries.map(([currency, amount]) => formatMoney(amount, currency)).join(" + ");
}

function statusClass(status: PayoutStatus) {
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-700";
  if (status === "FAILED") return "bg-red-100 text-red-700";
  if (status === "PROCESSING") return "bg-blue-100 text-blue-700";
  if (status === "CANCELLED") return "bg-zinc-100 text-zinc-600";
  return "bg-amber-100 text-amber-700";
}

export default function PayoutsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("bulk");
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [progress, setProgress] = useState<ProgressRecipient[]>([]);

  const { connected, subscribe } = useDashboardSocket();

  const { data: payouts } = useQuery<PayoutsResponse>({
    queryKey: ["payouts", "recent"],
    queryFn: () => api.get("/payouts", { params: { limit: 100, offset: 0 } }),
  });

  const validRows = rows.filter((row) => row.status === "valid");
  const invalidRows = rows.filter((row) => row.status === "error");
  const totalsByCurrency = validRows.reduce<Record<string, number>>((totals, row) => {
    const currency = row.currency || "USD";
    totals[currency] = (totals[currency] ?? 0) + Number(row.amount || 0);
    return totals;
  }, {});
  const feesByCurrency = Object.fromEntries(
    Object.entries(totalsByCurrency).map(([currency, amount]) => [currency, amount * FEE_RATE])
  );
  const debitByCurrency = Object.fromEntries(
    Object.entries(totalsByCurrency).map(([currency, amount]) => [
      currency,
      amount + (feesByCurrency[currency] ?? 0),
    ])
  );
  const completedCount = progress.filter((item) => item.status === "COMPLETED").length;
  const finishedCount = progress.filter((item) => ["COMPLETED", "FAILED"].includes(item.status)).length;
  const progressPercent = progress.length ? Math.round((finishedCount / progress.length) * 100) : 0;

  const summaryCards = useMemo(() => {
    const data = payouts?.data ?? [];
    const pending = data.filter((item) => item.status === "PENDING" || item.status === "PROCESSING").length;
    const paidOut = data
      .filter((item) => item.status === "COMPLETED")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return [
      { label: "Available balance", value: formatMoney(128_450, "USD") },
      { label: "Pending", value: String(pending) },
      { label: "Total paid out", value: formatMoney(paidOut || 0, "USD") },
    ];
  }, [payouts]);

  useEffect(() => {
    return subscribe("message", (payload) => {
      const envelope = payload as SocketEnvelope;
      if (envelope.event !== "payout:status" || !envelope.data?.payoutId || !envelope.data.status) return;

      setProgress((current) =>
        current.map((recipient) =>
          recipient.payoutId === envelope.data?.payoutId
            ? {
                ...recipient,
                status: envelope.data.status,
                failureReason: envelope.data.failureReason ?? recipient.failureReason,
              }
            : recipient
        )
      );
    });
  }, [subscribe]);

  function loadCsv(text: string, name: string) {
    setUploadError("");
    setSubmitError("");
    setProgress([]);

    const parsed = parseCsv(text);
    const [headers, ...body] = parsed;
    const normalizedHeaders = headers?.map((header) => header.trim().toLowerCase()) ?? [];
    const missing = REQUIRED_HEADERS.filter((header) => !normalizedHeaders.includes(header));

    if (!headers?.length || missing.length) {
      setRows([]);
      setUploadError(`Missing columns: ${missing.join(", ")}`);
      return;
    }

    const nextRows = body.map((values, index) => {
      const raw = Object.fromEntries(
        REQUIRED_HEADERS.map((header) => [
          header,
          values[normalizedHeaders.indexOf(header)] ?? "",
        ])
      ) as Record<(typeof REQUIRED_HEADERS)[number], string>;

      return validateRow({
        id: `${Date.now()}-${index}`,
        rowNumber: index + 2,
        recipient_name: raw.recipient_name,
        destination_type: raw.destination_type,
        account_details: raw.account_details,
        amount: raw.amount,
        currency: raw.currency,
      });
    });

    setRows(nextRows);
    setFileName(name);
  }

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Upload a CSV file");
      return;
    }
    loadCsv(await file.text(), file.name);
  }

  function updateRow(id: string, field: (typeof REQUIRED_HEADERS)[number], value: string) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        return validateRow({
          id: row.id,
          rowNumber: row.rowNumber,
          recipient_name: field === "recipient_name" ? value : row.recipient_name,
          destination_type: field === "destination_type" ? value : row.destination_type,
          account_details: field === "account_details" ? value : row.account_details,
          amount: field === "amount" ? value : row.amount,
          currency: field === "currency" ? value : row.currency,
        });
      })
    );
  }

  function downloadTemplate() {
    const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "useroutr-bulk-payout-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function submitBulkPayout() {
    setSubmitError("");
    if (!validRows.length || invalidRows.length) return;
    if (TWO_FACTOR_ENABLED && !/^\d{6}$/.test(twoFactorCode)) {
      setSubmitError("Enter the 6-digit 2FA code to confirm this payout");
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.post<BulkPayoutResult>("/payouts/bulk", {
        payouts: validRows.map(rowToPayout),
      });

      setProgress(
        validRows.map((row, index) => {
          const item = result.payouts.find((payout) => payout.index === index);
          return {
            rowId: row.id,
            payoutId: item?.payoutId,
            recipientName: row.recipient_name,
            amount: row.amount,
            currency: row.currency,
            status: item?.error ? "FAILED" : "PENDING",
            failureReason: item?.error,
          };
        })
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Bulk payout failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function retryRecipient(recipient: ProgressRecipient) {
    if (!recipient.payoutId) return;
    setProgress((current) =>
      current.map((item) =>
        item.rowId === recipient.rowId
          ? { ...item, status: "PENDING", failureReason: undefined }
          : item
      )
    );
    try {
      await api.post(`/payouts/${recipient.payoutId}/retry`);
    } catch (error) {
      setProgress((current) =>
        current.map((item) =>
          item.rowId === recipient.rowId
            ? {
                ...item,
                status: "FAILED",
                failureReason: error instanceof Error ? error.message : "Retry failed",
              }
            : item
        )
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Payouts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and monitor recipient disbursements.
          </p>
        </div>
        <div className="inline-flex w-full rounded-md border border-border p-1 sm:w-auto">
          {(["single", "bulk"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "h-9 flex-1 rounded px-4 text-sm font-medium transition sm:flex-none",
                activeTab === tab
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {tab === "single" ? "Single payout" : "Bulk payout"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      {activeTab === "single" ? (
        <div className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-sm md:grid-cols-2">
          {["Recipient", "Destination", "Amount", "Currency"].map((label) => (
            <label key={label} className="space-y-2 text-sm font-medium text-foreground">
              <span>{label}</span>
              <input
                disabled
                className="h-10 w-full rounded-md border border-input bg-muted px-3 text-sm"
              />
            </label>
          ))}
          <div className="md:col-span-2">
            <Button type="button" disabled>
              Create payout
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
            onDragOver={(event) => event.preventDefault()}
            className="rounded-lg border border-dashed border-border bg-card p-8 text-center shadow-sm"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-muted">
              <UploadCloud className="h-5 w-5 text-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">
              {fileName || "Drop CSV here or choose a file"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              recipient_name, destination_type, account_details, amount, currency
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button type="button" onClick={() => fileInputRef.current?.click()}>
                <FileSpreadsheet className="h-4 w-4" />
                Upload CSV
              </Button>
              <Button type="button" variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4" />
                Template
              </Button>
              {!!rows.length && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRows([]);
                    setFileName("");
                    setProgress([]);
                    setTwoFactorCode("");
                  }}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Re-upload
                </Button>
              )}
            </div>
            {uploadError && (
              <p className="mt-4 text-sm font-medium text-red-600">{uploadError}</p>
            )}
          </div>

          {!!rows.length && (
            <>
              <div className="rounded-lg border border-border bg-card shadow-sm">
                <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">CSV validation</h3>
                    <p className="text-xs text-muted-foreground">
                      {validRows.length} valid, {invalidRows.length} need fixes
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Valid
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                      Error
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Row</th>
                        {REQUIRED_HEADERS.map((header) => (
                          <th key={header} className="px-4 py-3">
                            {header}
                          </th>
                        ))}
                        <th className="px-4 py-3">Errors</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((row) => {
                        const editing = editingId === row.id;
                        return (
                          <tr
                            key={row.id}
                            className={cn(
                              row.status === "valid" ? "bg-emerald-50/45" : "bg-red-50/60"
                            )}
                          >
                            <td className="px-4 py-3 font-medium">{row.rowNumber}</td>
                            {REQUIRED_HEADERS.map((field) => (
                              <td key={field} className="px-4 py-3 align-top">
                                {editing ? (
                                  <input
                                    value={row[field]}
                                    onChange={(event) => updateRow(row.id, field, event.target.value)}
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                                  />
                                ) : (
                                  <span className="block max-w-[220px] truncate text-foreground">
                                    {row[field]}
                                  </span>
                                )}
                              </td>
                            ))}
                            <td className="px-4 py-3 align-top">
                              {row.errors.length ? (
                                <div className="space-y-1">
                                  {row.errors.map((error) => (
                                    <p key={error} className="text-xs font-medium text-red-700">
                                      {error}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs font-medium text-emerald-700">Ready</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingId(editing ? null : row.id)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                {editing ? "Done" : "Fix"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-foreground">Confirmation summary</h3>
                  <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Total amount</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatTotals(totalsByCurrency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Recipients</p>
                      <p className="mt-1 text-lg font-semibold">{validRows.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Estimated fees</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatTotals(feesByCurrency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Settlement time</p>
                      <p className="mt-1 text-lg font-semibold">1-2 days</p>
                    </div>
                  </div>

                  {TWO_FACTOR_ENABLED && (
                    <div className="mt-6 flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
                      <ShieldCheck className="h-5 w-5 text-foreground" />
                      <label className="text-sm font-medium text-foreground" htmlFor="payout-2fa">
                        2FA code
                      </label>
                      <input
                        id="payout-2fa"
                        value={twoFactorCode}
                        onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        inputMode="numeric"
                        placeholder="000000"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm tracking-[0.2em] outline-none focus:ring-2 focus:ring-ring sm:ml-auto sm:w-36"
                      />
                    </div>
                  )}

                  {submitError && <p className="mt-4 text-sm font-medium text-red-600">{submitError}</p>}

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      disabled={!validRows.length || !!invalidRows.length || submitting}
                      onClick={() => void submitBulkPayout()}
                    >
                      {submitting ? "Submitting..." : "Confirm bulk payout"}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Live {connected ? "connected" : "connecting"}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-foreground">Batch readiness</h3>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Valid rows</span>
                      <span className="font-medium">{validRows.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Fixable rows</span>
                      <span className="font-medium">{invalidRows.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total debit</span>
                      <span className="font-medium">
                        {formatTotals(debitByCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {!!progress.length && (
            <div className="rounded-lg border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Progress tracker</h3>
                    <p className="text-xs text-muted-foreground">
                      {completedCount} of {progress.length} completed
                    </p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted sm:w-64">
                    <div
                      className="h-full rounded-full bg-foreground transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="divide-y divide-border">
                {progress.map((recipient) => (
                  <div
                    key={recipient.rowId}
                    className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_140px_160px_auto] md:items-center"
                  >
                    <div>
                      <p className="font-medium text-foreground">{recipient.recipientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {recipient.amount} {recipient.currency}
                      </p>
                      {recipient.failureReason && (
                        <p className="mt-1 text-xs font-medium text-red-700">
                          {recipient.failureReason}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold",
                        statusClass(recipient.status)
                      )}
                    >
                      {recipient.status}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {recipient.status === "PENDING" && "Pending"}
                      {recipient.status === "PROCESSING" && "Processing"}
                      {recipient.status === "COMPLETED" && "Completed"}
                      {recipient.status === "FAILED" && "Failed"}
                      {recipient.status === "CANCELLED" && "Cancelled"}
                    </p>
                    {recipient.status === "FAILED" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void retryRecipient(recipient)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Retry
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
