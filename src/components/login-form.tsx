"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LoaderCircle, MapPinned } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { signInAction } from "@/lib/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginSystemStatus = {
  activeEventsCount: number | null;
  available: boolean;
};

function systemStatusText(status: LoginSystemStatus) {
  if (status.available && status.activeEventsCount !== null) {
    return `${status.activeEventsCount} kejadian aktif · Sistem operasional`;
  }

  return "Sistem operasional";
}

export function LoginForm({ systemStatus }: { systemStatus: LoginSystemStatus }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(signInAction, {});

  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-col">
      <div className="mb-10 flex justify-start">
        <BrandMark compact className="h-14 w-52" />
      </div>

      <p className="mb-5 flex items-center gap-2 text-sm font-medium text-[#4f6763]">
        <span className="size-2 rounded-full bg-status-critical" aria-hidden="true" />
        {systemStatusText(systemStatus)}
      </p>

      <div className="text-left">
        <h1 className="text-balance text-3xl font-semibold tracking-[-0.04em] text-[#0a1f2d] sm:text-4xl">
          Masuk ke SiagaKita
        </h1>
        <p className="mt-3 text-base leading-7 text-[#56706c]">Akses terbatas untuk petugas berwenang.</p>
      </div>

      <form action={formAction} className="mt-10 grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-semibold text-[#0a1f2d]">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="operator@siagakita.local"
            className="h-14 rounded-[1.25rem] border-[#0e2b3c]/18 bg-white/80 px-5 text-base text-[#0a1f2d] shadow-[inset_0_1px_0_rgb(255_255_255/0.72),0_14px_34px_rgb(14_43_60/0.05)] placeholder:text-[#5f706d]/70 focus-visible:border-[var(--color-brand)] focus-visible:bg-white"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-base font-semibold text-[#0a1f2d]">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Masukkan kata sandi"
              className="h-14 rounded-[1.25rem] border-[#0e2b3c]/18 bg-white/80 px-5 pr-14 text-base text-[#0a1f2d] shadow-[inset_0_1px_0_rgb(255_255_255/0.72),0_14px_34px_rgb(14_43_60/0.05)] placeholder:text-[#5f706d]/70 focus-visible:border-[var(--color-brand)] focus-visible:bg-white"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 size-10 text-[#0a1f2d]/54 hover:bg-[#0e2b3c]/8 hover:text-[#0a1f2d]"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </div>
        {state.error ? (
          <p className="rounded-2xl border border-status-critical/35 bg-status-critical/15 px-4 py-3 text-sm leading-6 text-[var(--color-critical-deep)]">
            {state.error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="mt-2 h-14 w-full rounded-[1.125rem] border-0 bg-[#0a1f2d] text-base font-semibold text-white shadow-[0_18px_42px_rgb(14_43_60/0.18)] hover:bg-[#14384b] focus-visible:ring-[#0a1f2d] active:translate-y-px"
          disabled={pending}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          {pending ? "Memeriksa akses..." : "Masuk ke sistem"}
        </Button>
      </form>

      <div className="my-7 h-px bg-[#0e2b3c]/12" />

      <Alert className="rounded-[1.25rem] border-[#0e2b3c]/14 bg-white/70 text-[#0a1f2d] shadow-[0_14px_34px_rgb(14_43_60/0.05)]">
        <MapPinned />
        <AlertDescription className="space-y-1 text-[#56706c]">
          <span className="block">Ingin melihat informasi bencana tanpa masuk?</span>
          <Link href="/peta-publik" className="inline-flex font-semibold text-[#0a1f2d] hover:underline">
            Buka Peta Publik
          </Link>
        </AlertDescription>
      </Alert>
      {process.env.NODE_ENV === "development" ? (
        <p className="mt-6 text-center text-xs text-[#56706c]/72">Akun pengembangan hanya untuk lingkungan lokal.</p>
      ) : null}
    </div>
  );
}
