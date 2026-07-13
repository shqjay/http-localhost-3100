"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, Check, LoaderCircle, Mail } from "lucide-react";

const assetPrefix = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const registrationApiUrl =
  process.env.NEXT_PUBLIC_REGISTRATION_API_URL ?? "/api/user/init";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^@\s]+@qq\.com$/.test(normalizedEmail)) {
      setError("请使用有效的 QQ 邮箱注册");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(registrationApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail })
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error || "提交失败，请稍后重试");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
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
              <p className="text-xs font-semibold text-cyan-300">
                邀请制访问
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal text-white">
                AstraOS
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                商业信号智能系统
              </p>
            </div>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-cyan-300">
              <Mail className="size-5" />
            </span>
          </div>

          {!submitted ? (
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
                aria-describedby={error ? "registration-error" : undefined}
                className="focus-ring h-12 w-full rounded-lg border border-white/10 bg-white/[0.05] px-4 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:bg-white/[0.07] sm:text-sm"
              />
              <div className="min-h-7 pt-2">
                {error && (
                  <p id="registration-error" className="text-sm text-red-300">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="focus-ring mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-void transition hover:bg-cyan-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    提交中
                  </>
                ) : (
                  "提交申请"
                )}
              </button>

              <p className="mt-5 text-xs leading-5 text-slate-500">
                提交后，团队将人工审核您的申请。审核通过后，您将通过邮箱收到 AstraOS 使用权限。
              </p>
            </form>
          ) : (
            <div className="py-10 text-center" role="status">
              <span className="mx-auto grid size-12 place-items-center rounded-full border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
                <Check className="size-6" />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-white">
                申请已提交
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                请留意您的邮箱，我们将尽快处理您的申请。
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}