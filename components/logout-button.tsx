"use client";

import { useState } from "react";
import { LogOut, LoaderCircle } from "lucide-react";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.replace("/register");
    }
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      title={compact ? "退出登录" : undefined}
      aria-label={compact ? "退出登录" : undefined}
      className={
        "focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:opacity-60 " +
        (compact ? "w-10 px-0" : "px-4")
      }
    >
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      {!compact && "退出登录"}
    </button>
  );
}