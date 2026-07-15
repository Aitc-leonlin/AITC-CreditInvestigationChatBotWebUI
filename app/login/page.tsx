"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { KeyRound, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginMembership } from "@/services/api/membershipAuthApi";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("system.admin");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      await loginMembership({ login, password, rememberMe });
      toast.success("登入成功");
      const nextPath =
        typeof window === "undefined"
          ? null
          : new URLSearchParams(window.location.search).get("next");
      router.push(nextPath?.startsWith("/") ? nextPath : "/membership/users");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登入失敗");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid h-full place-items-center overflow-auto bg-[#f8fcff] px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-[#d6e8f4] bg-white p-6 shadow-[0_18px_48px_rgba(35,92,124,0.10)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#235c7c] text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-[#12344a]">會員權限登入</h1>
            <p className="text-sm text-[#5d7b90]">使用企業帳號進入管理模組。</p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            帳號或 Email
            <Input value={login} onChange={(event) => setLogin(event.target.value)} required />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            密碼
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            Remember me
          </label>
          <Button type="submit" disabled={isSubmitting} className="bg-[#235c7c] text-white hover:bg-[#16445f]">
            <LogIn className="h-4 w-4" />
            登入
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-[#235c7c] hover:underline">
            忘記密碼
          </Link>
          <Link href="/reset-password" className="inline-flex items-center gap-1 text-[#235c7c] hover:underline">
            <KeyRound className="h-4 w-4" />
            重設密碼
          </Link>
        </div>
      </section>
    </main>
  );
}
