import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IntelligenceDashboard } from "@/components/intelligence-dashboard";
import { getCurrentApplicationUser } from "@/lib/server/auth";
import { loadIntelligenceState } from "@/lib/server/intelligence-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "业务信号指挥台 | AstraOS",
  description: "监测公开业务来源、识别关键信号并审批行动建议。",
  robots: { index: false, follow: false }
};

export default async function WorkspacePage() {
  const { session, user } = await getCurrentApplicationUser();

  if (!session || !user) redirect("/register?reason=login");
  if (user.status !== "approved") {
    redirect("/register?status=" + user.status);
  }

  const state = await loadIntelligenceState(session.subject, user.email);
  return <IntelligenceDashboard initialState={state} email={user.email} />;
}