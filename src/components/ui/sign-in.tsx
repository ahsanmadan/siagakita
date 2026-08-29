"use client";

import * as React from "react";
import { useActionState, useState } from "react";
import Link from "next/link";
import { EyeOpenIcon, EyeClosedIcon, ArrowLeftIcon } from "@radix-ui/react-icons";
import { signInAction } from "@/lib/actions/auth";
import { InputShake } from "@/components/ui/input-shake";
import { LegalModal } from "@/components/legal-modal";

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
}

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="t-glass-field mt-1.5 rounded-xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-primary/70 focus-within:bg-primary/10">
    {children}
  </div>
);

export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-semibold text-foreground">Selamat Datang</span>,
  description = "Masuk untuk mengakses ruang operasi tanggap darurat SiagaKita.",
  heroImageSrc,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(signInAction, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [shakeCount, setShakeCount] = useState(0);

  React.useEffect(() => {
    if (state.error) {
      setClientError(state.error);
      setShakeCount((c) => c + 1);
    }
  }, [state]);

  const activeError = clientError ?? state.error ?? null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!email.trim()) {
      event.preventDefault();
      setClientError("Silakan masukkan email terlebih dahulu.");
      setShakeCount((c) => c + 1);
      return;
    }
    if (!password) {
      event.preventDefault();
      setClientError("Silakan masukkan kata sandi Anda.");
      setShakeCount((c) => c + 1);
    }
  };

  const clearError = () => {
    if (clientError) setClientError(null);
  };

  return (
    <div className="flex min-h-[100dvh] w-full flex-col md:flex-row">
      {/* Left column: sign-in form */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 pb-12 pt-24 sm:px-12 sm:pb-20 sm:pt-20">
        <div className="absolute left-1/2 top-7 z-20 -translate-x-1/2 sm:left-10 sm:top-8 sm:translate-x-0">
          <img
            src="/brand/logo-siagakita.png"
            alt="Logo SiagaKita"
            className="h-9 w-auto object-contain sm:h-10"
          />
        </div>

        <div className="w-full max-w-[25rem]">
          <div className="flex flex-col gap-6 sm:gap-7">
            <Link
              href="/peta-publik"
              className="animate-element animate-delay-100 inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeftIcon className="size-3.5" />
              Kembali ke Peta Publik
            </Link>

            <div className="space-y-2.5">
              <h1 className="animate-element animate-delay-200 text-[1.75rem] font-semibold leading-[1.15] tracking-tight sm:text-3xl md:text-[2.5rem]">
                {title}
              </h1>
              <p className="animate-element animate-delay-300 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit} action={formAction} noValidate>
              <div className="animate-element animate-delay-400">
                <label htmlFor="email" className="text-[13px] font-medium text-foreground/75">
                  Email
                </label>
                <InputShake trigger={shakeCount} hasError={Boolean(activeError)} onCancel={clearError}>
                  <GlassInputWrapper>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        clearError();
                      }}
                      placeholder="operator@siagakita.local"
                      className="w-full rounded-xl bg-transparent px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </GlassInputWrapper>
                </InputShake>
              </div>

              <div className="animate-element animate-delay-500">
                <label htmlFor="password" className="text-[13px] font-medium text-foreground/75">
                  Kata Sandi
                </label>
                <InputShake trigger={shakeCount} hasError={Boolean(activeError)} onCancel={clearError}>
                  <GlassInputWrapper>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          clearError();
                        }}
                        placeholder="Masukkan kata sandi"
                        className="w-full rounded-xl bg-transparent px-4 py-3.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute inset-y-0 right-3 flex items-center"
                        aria-label={showPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                      >
                        <span className="t-icon-swap size-5" data-state={showPassword ? "a" : "b"}>
                          <span className="t-icon" data-icon="a">
                            <EyeClosedIcon className="size-5 text-muted-foreground transition-colors hover:text-foreground" />
                          </span>
                          <span className="t-icon" data-icon="b">
                            <EyeOpenIcon className="size-5 text-muted-foreground transition-colors hover:text-foreground" />
                          </span>
                        </span>
                      </button>
                    </div>
                  </GlassInputWrapper>
                </InputShake>
              </div>

              {activeError ? (
                <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-[13px] font-medium text-destructive">
                  {activeError}
                </p>
              ) : null}

              <div className="animate-element animate-delay-600 flex items-center justify-between gap-4 pt-0.5 text-[13px]">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" name="rememberMe" className="custom-checkbox" />
                  <span className="text-foreground/90">Biarkan saya tetap masuk</span>
                </label>
                <Link href="/peta-publik" className="rounded-sm text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]">
                  Lupa sandi
                </Link>
              </div>

              <button
                type="submit"
                disabled={pending}
                className="animate-element animate-delay-700 mt-1 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] active:scale-[0.99] disabled:opacity-70 disabled:active:scale-100"
              >
                {pending ? "Memeriksa..." : "Masuk"}
              </button>
            </form>

            <div className="animate-element animate-delay-800 space-y-1 pt-1 text-center">
              <p className="text-balance text-xs leading-relaxed text-muted-foreground sm:text-[13px]">Belum punya akses? Hubungi admin BPBD wilayah Anda.</p>
              <p className="text-[11px] text-muted-foreground/80">© 2026 SiagaKita</p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex w-full justify-center sm:absolute sm:inset-x-0 sm:bottom-8 sm:z-20 sm:mt-0">
          <LegalModal />
        </div>
      </section>

      {/* Right column: hero image */}
      {heroImageSrc ? (
        <section className="relative hidden flex-1 p-4 md:block">
          <div
            className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center shadow-[inset_0_70px_90px_-50px_rgba(0,0,0,0.38),inset_0_-40px_70px_-50px_rgba(0,0,0,0.22),inset_0_0_150px_-60px_rgba(0,0,0,0.30)]"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          />
        </section>
      ) : null}
    </div>
  );
};
