"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock3,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck
} from "lucide-react";

const assetPrefix = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const registrationApiUrl =
  process.env.NEXT_PUBLIC_REGISTRATION_API_URL ?? "/api/user/init";

type RegistrationStatus = "pending" | "approved" | "rejected";
type View = "form" | "pending" | "rejected";

type StatusResponse = {
  authenticated?: boolean;
  email?: string;
  error?: string;
  approved?: boolean;
  status?: RegistrationStatus;
  redirectTo?: string | null;
};

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<View>("form");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState("");

  const applyStatus = useCallback((data: StatusResponse) => {
    if (data.email) setEmail(data.email);

    if (data.status === "approved") {
      window.location.replace(data.redirectTo || "/workspace");
      return;
    }

    if (data.status === "pending") setView("pending");
    if (data.status === "rejected") setView("rejected");
  }, []);

  const checkStatus = useCallback(
    async (showErrors = false) => {
      setChecking(true);

      try {
        const response = await fetch("/api/auth/status", {
          cache: "no-store",
          credentials: "same-origin"
        });
        const data = (await response.json().catch(() => ({}))) as StatusResponse;

        if (response.status === 401) return;
        if (!response.ok) {
          if (showErrors) setError(data.error || "暂时无法查询审核状态");
          return;
        }

        setError("");
        applyStatus(data);
      } catch {
        if (showErrors) setError("网络错误，请稍后重试");
      } finally {
        setChecking(false);
      }
    },
    [applyStatus]
  );

  useEffect(() => {
    void checkStatus().finally(() => setRestoring(false));
  }, [checkStatus]);

  useEffect(() => {
    if (view !== "pending") return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkStatus();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [checkStatus, view]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^\d{5,12}@qq\.com$/.test(normalizedEmail)) {
      setError("请使用有效的 QQ 邮箱注册");
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).{10,72}$/.test(password)) {
      setError("密码需为 10-72 位，并同时包含字母和数字");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(registrationApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: normalizedEmail, password })
      });
      const data = (await response.json().catch(() => ({}))) as StatusResponse;

      if (!response.ok) {
        setError(data.error || "提交失败，请稍后重试");
        return;
      }

      setEmail(normalizedEmail);
      setPassword("");
      applyStatus(data);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const resetSession = async () => {
    setLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin"
      });
    } finally {
      setEmail("");
      setPassword("");
      setError("");
      setView("form");
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-void px-4 py-8 text-white sm:py-12">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(135deg,rgba(124,58,237,.12),transparent_38%,rgba(6,182,212,.08)_72%,transparent)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center sm:min-h-[calc(100vh-6rem)]">
        <a
          href={assetPrefix + "/"}
          className="focus-ring mb-5 inline-flex w-fit items-center gap-2 rounded-lg px-1 py-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="size-4" />
          返回首页
        </a>

        <section className="glass gradient-border rounded-2xl p-6 shadow-2xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-cyan-300">邀请制访问</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal text-white">
                AstraOS
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                申请访问或登录您的账户
              </p>
            </div>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-cyan-300">
              {view === "form" ? (
                <Mail className="size-5" />
              ) : (
                <ShieldCheck className="size-5" />
              )}
            </span>
          </div>

          {restoring ? (
            <div className="flex min-h-72 items-center justify-center" role="status">
              <LoaderCircle className="size-6 animate-spin text-cyan-300" />
              <span className="sr-only">正在恢复登录状态</span>
            </div>
          ) : view === "form" ? (
            <form className="mt-8" onSubmit={handleSubmit} noValidate>
              <label
                htmlFor="registration-email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                QQ 邮箱
              </label>
              <input
                id="registration-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError("");
                }}
                placeholder="123456789@qq.com"
                aria-invalid={Boolean(error)}
                className="focus-ring h-12 w-full rounded-lg border border-white/10 bg-white/[0.05] px-4 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:bg-white/[0.07] sm:text-sm"
              />

              <label
                htmlFor="registration-password"
                className="mb-2 mt-5 block text-sm font-medium text-slate-300"
              >
                访问密码
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="registration-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="至少 10 位，包含字母和数字"
                  aria-invalid={Boolean(error)}
                  aria-describedby="password-hint registration-error"
                  className="focus-ring h-12 w-full rounded-lg border border-white/10 bg-white/[0.05] pl-11 pr-12 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:bg-white/[0.07] sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="focus-ring absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <p id="password-hint" className="mt-2 text-xs leading-5 text-slate-500">
                首次申请时创建密码；再次访问时使用相同密码登录。
              </p>

              <div className="min-h-8 pt-2">
                {error && (
                  <p id="registration-error" className="text-sm text-red-300">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim() || !password}
                className="focus-ring mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-void transition hover:bg-cyan-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    正在处理
                  </>
                ) : (
                  "提交申请或登录"
                )}
              </button>

              <p className="mt-5 text-xs leading-5 text-slate-500">
                新申请将由团队人工审核。审核通过后，保持本页打开即可自动进入访问中心。
              </p>
            </form>
          ) : view === "pending" ? (
            <div className="py-9 text-center" role="status" aria-live="polite">
              <span className="mx-auto grid size-12 place-items-center rounded-full border border-cyan-300/20 bg-cyan-400/10 text-cyan-300">
                <Clock3 className="size-6" />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-white">正在等待审核</h2>
              <p className="mt-2 break-all text-sm text-slate-400">{email}</p>
              <div className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400">
                <LoaderCircle className="size-3.5 animate-spin text-cyan-300" />
                自动检查审核状态
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-400">
                管理员通过后，本页会自动跳转并解锁访问权限。
              </p>
              {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void checkStatus(true)}
                  disabled={checking}
                  className="focus-ring flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-void transition hover:bg-cyan-50 disabled:opacity-60"
                >
                  <RefreshCw className={"size-4 " + (checking ? "animate-spin" : "")} />
                  立即检查
                </button>
                <button
                  type="button"
                  onClick={() => void resetSession()}
                  disabled={loading}
                  className="focus-ring h-11 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
                >
                  更换账户
                </button>
              </div>
            </div>
          ) : (
            <div className="py-9 text-center" role="status">
              <span className="mx-auto grid size-12 place-items-center rounded-full border border-red-300/20 bg-red-400/10 text-red-300">
                <AlertCircle className="size-6" />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-white">申请未通过</h2>
              <p className="mt-2 break-all text-sm text-slate-400">{email}</p>
              <p className="mt-5 text-sm leading-6 text-slate-400">
                当前账户暂未获得 AstraOS 访问权限。
              </p>
              <button
                type="button"
                onClick={() => void resetSession()}
                disabled={loading}
                className="focus-ring mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
              >
                <Check className="size-4" />
                使用其他账户
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}