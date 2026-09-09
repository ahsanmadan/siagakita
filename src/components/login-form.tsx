"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { signInAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputShake } from "@/components/ui/input-shake";
import { LegalModal } from "@/components/legal-modal";

type LoginSystemStatus = {
  activeEventsCount: number | null;
  available: boolean;
};

const demoAccounts = [
  { role: "Admin", email: "admin@siagakita.local" },
  { role: "BPBD", email: "operator@siagakita.local" },
  { role: "Lapangan", email: "lapangan@siagakita.local" },
  { role: "Posko", email: "posko@siagakita.local" },
  { role: "Gudang", email: "gudang@siagakita.local" },
];

export function LoginForm({ systemStatus }: { systemStatus: LoginSystemStatus }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(signInAction, {});
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [shakeCount, setShakeCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // Memicu shake setiap kali server mengembalikan error
  useEffect(() => {
    if (state.error) {
      setClientError(state.error);
      setShakeCount((c) => c + 1);
    }
  }, [state.error, state]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Validasi instan sebelum ke server (menghindari popup native browser)
    if (!email.trim()) {
      e.preventDefault();
      setClientError("Silakan masukkan email terlebih dahulu.");
      setShakeCount((c) => c + 1);
      return;
    }
    if (!password) {
      e.preventDefault();
      setClientError("Silakan masukkan kata sandi Anda.");
      setShakeCount((c) => c + 1);
      return;
    }
    // Jika valid, lanjutkan submit formAction
  };

  const handleInputChange = () => {
    if (clientError) {
      setClientError(null);
    }
  };

  const activeError = clientError || state.error;

  return (
    <div className="w-full max-w-[23rem] sm:max-w-[25rem]">
      <div className="mb-4 flex items-center">
        <Link
          href="/peta-publik"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="size-3.5" />
          Kembali ke Peta Publik
        </Link>
      </div>

      <Card className="border border-border/80 bg-card shadow-sm rounded-xl">
        <CardHeader className="space-y-1.5 p-6 pb-3">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">SiagaKita</span>
          <CardTitle className="text-xl font-bold tracking-tight text-foreground font-display">
            Masuk Petugas
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground leading-relaxed">
            Masukkan email dan kata sandi untuk mengakses ruang operasi.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-6 pt-0">
          <form
            ref={formRef}
            action={formAction}
            onSubmit={handleSubmit}
            noValidate
            className="space-y-3.5"
          >
            <InputShake trigger={shakeCount} hasError={Boolean(activeError)} onCancel={() => setClientError(null)}>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="operator@siagakita.local"
                  className="h-10 text-[13px] font-normal placeholder:text-[13px] placeholder:font-normal placeholder:text-muted-foreground text-foreground tracking-normal font-sans rounded-md bg-background"
                />
              </div>
            </InputShake>

            <InputShake trigger={shakeCount} hasError={Boolean(activeError)} onCancel={() => setClientError(null)}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-foreground">
                    Kata Sandi
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      handleInputChange();
                    }}
                    placeholder="Masukkan kata sandi"
                    className="h-10 pr-9 text-[13px] font-normal placeholder:text-[13px] placeholder:font-normal placeholder:text-muted-foreground text-foreground tracking-normal font-sans rounded-md bg-background"
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </InputShake>

            {activeError ? (
              <div className="text-[11.5px] text-destructive font-medium bg-destructive/10 border border-destructive/20 rounded-md p-2.5 flex items-center gap-1.5 animate-in fade-in duration-200">
                <span>{activeError}</span>
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full h-9.5 text-xs font-medium rounded-md shadow-none"
              disabled={pending}
            >
              {pending ? <LoaderCircle className="size-3.5 animate-spin mr-1.5" /> : null}
              {pending ? "Memeriksa..." : "Masuk"}
            </Button>
          </form>

          {process.env.NODE_ENV === "development" ? (
            <div className="pt-3 border-t border-border/60 space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-medium text-foreground/80">Akun demo lokal</span>
                <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">siagakita123</code>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword("siagakita123");
                      setClientError(null);
                    }}
                    className="text-left rounded border border-border/50 bg-muted/40 hover:bg-muted/80 transition-colors p-1.5 text-[10.5px] cursor-pointer"
                  >
                    <span className="block font-medium text-foreground">{acc.role}</span>
                    <span className="block truncate text-muted-foreground font-mono text-[9.5px]">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Copyright khusus di bawah card */}
      <p className="mt-4 text-center text-xs text-muted-foreground/80">
        © 2026 SiagaKita
      </p>
    </div>
  );
}

