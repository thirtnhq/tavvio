import type { Metadata } from "next";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics | Useroutr Dashboard",
  description:
    "Merchant analytics for revenue, conversion, payment methods, failure patterns, and top currencies.",
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
