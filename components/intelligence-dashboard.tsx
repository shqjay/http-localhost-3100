"use client";

import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode
} from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Check,
  Clock3,
  Database,
  ExternalLink,
  FileJson,
  Globe2,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  Radar,
  RefreshCw,
  Rss,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X,
  Zap
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import type {
  BusinessSignal,
  DecisionPriority,
  IntelligenceDecision,
  IntelligenceState,
  SignalCategory,
  SignalSource,
  SourceKind
} from "@/lib/intelligence-types";

type View = "overview" | "sources" | "signals" | "decisions";

type ApiResponse = {
  state?: IntelligenceState;
  error?: string;
  warning?: string | null;
  createdSignal?: boolean;
};

const navigation: Array<{
  id: View;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", label: "概览", icon: LayoutDashboard },
  { id: "sources", label: "来源", icon: Database },
  { id: "signals", label: "信号", icon: Radar },
  { id: "decisions", label: "决策", icon: Target }
];

const categoryConfig: Record<
  SignalCategory,
  { label: string; className: string; icon: typeof TrendingUp }
> = {
  growth: {
    label: "增长",
    className: "border-emerald-300/20 bg-emerald-400/10 text-emerald-300",
    icon: TrendingUp
  },
  risk: {
    label: "风险",
    className: "border-red-300/20 bg-red-400/10 text-red-300",
    icon: AlertTriangle
  },
  competitive: {
    label: "竞争",
    className: "border-violet-300/20 bg-violet-400/10 text-violet-300",
    icon: Target
  },
  operational: {
    label: "运营",
    className: "border-cyan-300/20 bg-cyan-400/10 text-cyan-300",
    icon: Activity
  }
};

const priorityConfig: Record<DecisionPriority, { label: string; className: string }> = {
  critical: { label: "紧急", className: "text-red-300" },
  high: { label: "高", className: "text-amber-300" },
  medium: { label: "中", className: "text-cyan-300" },
  low: { label: "低", className: "text-slate-400" }
};

const sourceIcons: Record<SourceKind, typeof Globe2> = {
  website: Globe2,
  rss: Rss,
  json: FileJson
};

function formatDate(value: string | null) {
  if (!value) return "尚未扫描";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = "text-cyan-300"
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
  tone?: string;
}) {
  return (
    <div className="min-w-0 border-b border-white/10 py-5 sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className={"size-4 " + tone} />
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title }: { icon: typeof Radar; title: string }) {
  return (
    <div className="grid min-h-48 place-items-center border-y border-dashed border-white/10 text-center">
      <div>
        <Icon className="mx-auto size-7 text-slate-600" />
        <p className="mt-3 text-sm text-slate-500">{title}</p>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  action
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
      <div>
        <p className="text-xs font-semibold text-cyan-300">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function IntelligenceDashboard({
  initialState,
  email
}: {
  initialState: IntelligenceState;
  email: string;
}) {
  const [state, setState] = useState(initialState);
  const [view, setView] = useState<View>("overview");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceKind, setSourceKind] = useState<SourceKind>("website");
  const [scanInterval, setScanInterval] = useState("24");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busySourceId, setBusySourceId] = useState<string | null>(null);
  const [busyDecisionId, setBusyDecisionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const proposedDecisions = useMemo(
    () => state.decisions.filter((decision) => decision.status === "proposed"),
    [state.decisions]
  );
  const recentSignals = useMemo(
    () =>
      state.signals.filter(
        (signal) => Date.now() - new Date(signal.capturedAt).getTime() <= 24 * 60 * 60 * 1000
      ),
    [state.signals]
  );
  const highImpactSignals = useMemo(
    () => state.signals.filter((signal) => signal.impactScore >= 72),
    [state.signals]
  );

  const applyResponse = (data: ApiResponse) => {
    if (data.state) setState(data.state);
    if (data.warning) setNotice(data.warning);
    else setNotice("");
    setError("");
  };

  const request = async (url: string, init?: RequestInit) => {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers
      }
    });
    const data = (await response.json().catch(() => ({}))) as ApiResponse;
    if (response.status === 401 || response.status === 403) {
      window.location.replace("/register");
      throw new Error("登录状态已失效");
    }
    if (!response.ok) throw new Error(data.error || "操作失败");
    return data;
  };

  const refreshState = async () => {
    setRefreshing(true);
    try {
      applyResponse(await request("/api/intelligence"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "刷新失败");
    } finally {
      setRefreshing(false);
    }
  };

  const addSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const data = await request("/api/intelligence", {
        method: "POST",
        body: JSON.stringify({
          name: sourceName,
          url: sourceUrl,
          kind: sourceKind,
          scanIntervalHours: Number(scanInterval)
        })
      });
      applyResponse(data);
      setSourceName("");
      setSourceUrl("");
      setView("signals");
      setNotice(
        data.warning ||
          (data.createdSignal ? "来源已添加，并生成了首条业务信号。" : "来源已添加，当前内容没有产生新信号。")
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const scanSource = async (source: SignalSource) => {
    setBusySourceId(source.id);
    setError("");
    setNotice("");
    try {
      const data = await request(
        "/api/intelligence/sources/" + source.id + "/scan",
        { method: "POST" }
      );
      applyResponse(data);
      setNotice(
        data.createdSignal
          ? "扫描完成，已生成新的信号和决策建议。"
          : "扫描完成，来源内容没有变化。"
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "扫描失败");
      await refreshState();
    } finally {
      setBusySourceId(null);
    }
  };

  const deleteSource = async (source: SignalSource) => {
    if (!window.confirm("删除“" + source.name + "”及其全部信号和决策？")) return;
    setBusySourceId(source.id);
    setError("");
    try {
      applyResponse(
        await request("/api/intelligence/sources/" + source.id, {
          method: "DELETE"
        })
      );
      setNotice("信息来源已删除。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "删除失败");
    } finally {
      setBusySourceId(null);
    }
  };

  const reviewDecision = async (
    decision: IntelligenceDecision,
    status: "approved" | "dismissed"
  ) => {
    setBusyDecisionId(decision.id);
    setError("");
    try {
      applyResponse(
        await request("/api/intelligence/decisions/" + decision.id, {
          method: "PATCH",
          body: JSON.stringify({ status })
        })
      );
      setNotice(status === "approved" ? "决策建议已批准。" : "决策建议已忽略。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "更新失败");
    } finally {
      setBusyDecisionId(null);
    }
  };

  const renderSignal = (signal: BusinessSignal) => {
    const config = categoryConfig[signal.category];
    const Icon = config.icon;
    return (
      <article key={signal.id} className="border-b border-white/10 py-6 last:border-b-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={"inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium " + config.className}>
            <Icon className="size-3.5" />
            {config.label}
          </span>
          <span className="text-xs text-slate-500">影响 {signal.impactScore}</span>
          <span className="text-xs text-slate-500">置信度 {signal.confidence}%</span>
          <span className="ml-auto text-xs text-slate-600">{formatDate(signal.capturedAt)}</span>
        </div>
        <h3 className="mt-4 text-base font-semibold leading-6 text-white sm:text-lg">
          {signal.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">{signal.summary}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500">{signal.sourceName}</span>
          <a
            href={signal.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex items-center gap-1.5 rounded-md text-xs text-cyan-300 transition hover:text-cyan-200"
          >
            查看原文
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </article>
    );
  };

  const renderDecision = (decision: IntelligenceDecision) => {
    const priority = priorityConfig[decision.priority];
    const isBusy = busyDecisionId === decision.id;
    return (
      <article key={decision.id} className="border-b border-white/10 py-6 last:border-b-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className={"text-xs font-semibold " + priority.className}>
            {priority.label}优先级
          </span>
          <span className="text-xs text-slate-500">置信度 {decision.confidence}%</span>
          <span className="ml-auto text-xs text-slate-600">{formatDate(decision.createdAt)}</span>
        </div>
        <h3 className="mt-4 text-base font-semibold text-white sm:text-lg">{decision.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">{decision.rationale}</p>
        <div className="mt-4 border-l-2 border-cyan-300/40 pl-4 text-sm leading-6 text-slate-200">
          {decision.recommendedAction}
        </div>
        {decision.status === "proposed" ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void reviewDecision(decision, "approved")}
              disabled={isBusy}
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-void transition hover:bg-cyan-50 disabled:opacity-60"
            >
              {isBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
              批准建议
            </button>
            <button
              type="button"
              onClick={() => void reviewDecision(decision, "dismissed")}
              disabled={isBusy}
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
            >
              <X className="size-4" />
              忽略
            </button>
          </div>
        ) : (
          <div className="mt-5 inline-flex items-center gap-2 text-xs text-slate-500">
            {decision.status === "approved" ? <Check className="size-4 text-emerald-300" /> : <X className="size-4" />}
            {decision.status === "approved" ? "已批准" : "已忽略"}
          </div>
        )}
      </article>
    );
  };

  return (
    <main className="min-h-screen bg-void text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(135deg,rgba(124,58,237,.08),transparent_34%,rgba(6,182,212,.05)_72%,transparent)]" />
      <div className="relative mx-auto min-h-screen max-w-[1500px] lg:grid lg:grid-cols-[230px_1fr]">
        <aside className="border-b border-white/10 bg-black/10 px-4 py-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center justify-between lg:block">
            <Link href="/" className="focus-ring rounded-lg text-lg font-semibold">AstraOS</Link>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 lg:mt-3">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              系统在线
            </span>
          </div>
          <nav className="mt-5 grid grid-cols-4 gap-1 lg:mt-10 lg:block lg:space-y-1" aria-label="工作台导航">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={
                    "focus-ring flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-2 text-sm transition lg:w-full lg:justify-start lg:px-3 " +
                    (active
                      ? "bg-white/[0.09] text-white"
                      : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-200")
                  }
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-8 hidden border-t border-white/10 pt-5 lg:block">
            <p className="truncate text-xs text-slate-500">{email}</p>
            <div className="mt-3"><LogoutButton /></div>
          </div>
        </aside>

        <div className="min-w-0 px-4 py-6 sm:px-7 lg:px-10 lg:py-8">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <p className="text-xs font-semibold text-cyan-300">业务信号指挥台</p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                {navigation.find((item) => item.id === view)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="lg:hidden">
                <LogoutButton compact />
              </div>
              <button
                type="button"
                onClick={() => void refreshState()}
                disabled={refreshing}
                title="刷新数据"
                className="focus-ring grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
              >
                <RefreshCw className={"size-4 " + (refreshing ? "animate-spin" : "")} />
              </button>
              <button
                type="button"
                onClick={() => setView("sources")}
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-void transition hover:bg-cyan-50"
              >
                <Plus className="size-4" />
                添加来源
              </button>
            </div>
          </header>

          {(error || notice) && (
            <div
              className={
                "mt-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm " +
                (error
                  ? "border-red-300/20 bg-red-400/10 text-red-200"
                  : "border-cyan-300/20 bg-cyan-400/10 text-cyan-100")
              }
              role="status"
            >
              {error ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <Sparkles className="mt-0.5 size-4 shrink-0" />}
              <span>{error || notice}</span>
            </div>
          )}

          {view === "overview" && (
            <div>
              <section className="grid sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="活跃来源" value={state.sources.filter((source) => source.active).length} icon={Database} />
                <Metric label="24 小时新信号" value={recentSignals.length} icon={Radar} tone="text-violet-300" />
                <Metric label="待审批决策" value={proposedDecisions.length} icon={Clock3} tone="text-amber-300" />
                <Metric label="高影响信号" value={highImpactSignals.length} icon={Zap} tone="text-red-300" />
              </section>

              <section className="mt-10">
                <SectionHeader
                  eyebrow="决策队列"
                  title="需要管理者判断"
                  action={
                    <button type="button" onClick={() => setView("decisions")} className="focus-ring inline-flex items-center gap-1.5 rounded-md text-sm text-cyan-300 hover:text-cyan-200">
                      查看全部 <ArrowUpRight className="size-4" />
                    </button>
                  }
                />
                {proposedDecisions.length ? proposedDecisions.slice(0, 3).map(renderDecision) : <EmptyState icon={ShieldCheck} title="当前没有待审批决策" />}
              </section>

              <section className="mt-12">
                <SectionHeader
                  eyebrow="实时信号"
                  title="最新业务变化"
                  action={
                    <button type="button" onClick={() => setView("signals")} className="focus-ring inline-flex items-center gap-1.5 rounded-md text-sm text-cyan-300 hover:text-cyan-200">
                      查看全部 <ArrowUpRight className="size-4" />
                    </button>
                  }
                />
                {state.signals.length ? state.signals.slice(0, 4).map(renderSignal) : <EmptyState icon={Radar} title="添加来源后开始生成信号" />}
              </section>
            </div>
          )}

          {view === "sources" && (
            <div className="mt-8">
              <section>
                <SectionHeader eyebrow="信号入口" title="添加公开信息来源" />
                <form onSubmit={addSource} className="grid gap-4 border-b border-white/10 py-6 lg:grid-cols-[1fr_1.5fr_150px_120px_auto] lg:items-end">
                  <label className="block text-sm text-slate-400">
                    来源名称
                    <input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="竞品官网" maxLength={80} className="focus-ring mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-slate-600" />
                  </label>
                  <label className="block text-sm text-slate-400">
                    公开网址
                    <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://example.com/news" inputMode="url" className="focus-ring mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-slate-600" />
                  </label>
                  <label className="block text-sm text-slate-400">
                    类型
                    <select value={sourceKind} onChange={(event) => setSourceKind(event.target.value as SourceKind)} className="focus-ring mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#0a0d18] px-3 text-sm text-white outline-none">
                      <option value="website">网页</option>
                      <option value="rss">RSS</option>
                      <option value="json">JSON</option>
                    </select>
                  </label>
                  <label className="block text-sm text-slate-400">
                    间隔
                    <select value={scanInterval} onChange={(event) => setScanInterval(event.target.value)} className="focus-ring mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#0a0d18] px-3 text-sm text-white outline-none">
                      <option value="6">6 小时</option>
                      <option value="12">12 小时</option>
                      <option value="24">24 小时</option>
                      <option value="72">3 天</option>
                      <option value="168">7 天</option>
                    </select>
                  </label>
                  <button type="submit" disabled={submitting || !sourceName.trim() || !sourceUrl.trim()} className="focus-ring flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-void transition hover:bg-cyan-50 disabled:opacity-50">
                    {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    添加
                  </button>
                </form>
              </section>

              <section className="mt-10">
                <SectionHeader eyebrow="已连接" title={state.sources.length + " 个来源"} />
                {state.sources.length ? (
                  <div>
                    {state.sources.map((source) => {
                      const Icon = sourceIcons[source.kind];
                      const busy = busySourceId === source.id;
                      return (
                        <article key={source.id} className="grid gap-4 border-b border-white/10 py-5 lg:grid-cols-[minmax(0,1.5fr)_140px_180px_auto] lg:items-center">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-cyan-300"><Icon className="size-4" /></span>
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold text-white">{source.name}</h3>
                              <a href={source.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-slate-500 hover:text-slate-300">{source.url}</a>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            <span className={source.lastScanStatus === "success" ? "text-emerald-300" : source.lastScanStatus === "error" || source.lastScanStatus === "blocked" ? "text-red-300" : "text-slate-400"}>
                              {source.lastScanStatus === "success" ? "正常" : source.lastScanStatus === "scanning" ? "扫描中" : source.lastScanStatus === "blocked" ? "已阻止" : source.lastScanStatus === "error" ? "失败" : "待扫描"}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatDate(source.lastScannedAt)}
                            {source.lastError && <p className="mt-1 truncate text-red-300" title={source.lastError}>{source.lastError}</p>}
                          </div>
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => void scanSource(source)} disabled={busy} title="立即扫描" className="focus-ring grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50">
                              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
                            </button>
                            <button type="button" onClick={() => void deleteSource(source)} disabled={busy} title="删除来源" className="focus-ring grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-500 transition hover:border-red-300/20 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50">
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : <EmptyState icon={Database} title="尚未添加信息来源" />}
              </section>
            </div>
          )}

          {view === "signals" && (
            <section className="mt-8">
              <SectionHeader eyebrow="信号流" title={state.signals.length + " 条业务信号"} />
              {state.signals.length ? state.signals.map(renderSignal) : <EmptyState icon={Radar} title="扫描来源后将在这里显示信号" />}
            </section>
          )}

          {view === "decisions" && (
            <section className="mt-8">
              <SectionHeader eyebrow="审批队列" title={proposedDecisions.length + " 条待判断建议"} />
              {state.decisions.length ? state.decisions.map(renderDecision) : <EmptyState icon={Target} title="生成信号后将在这里显示决策建议" />}
            </section>
          )}

          <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-6 text-xs text-slate-600">
            <span>最后更新 {formatDate(state.updatedAt)}</span>
            <span className="inline-flex items-center gap-1.5"><BarChart3 className="size-3.5" /> 每日自动扫描</span>
          </footer>
        </div>
      </div>
    </main>
  );
}