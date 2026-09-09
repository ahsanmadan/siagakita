"use client";

import * as React from "react";
import { useActionState, useState } from "react";
import Link from "next/link";
import { EyeOpenIcon, EyeClosedIcon, ArrowLeftIcon, InfoCircledIcon, Cross2Icon } from "@radix-ui/react-icons";
import { signInAction } from "@/lib/actions/auth";
import { InputShake } from "@/components/ui/input-shake";
import { LegalModal } from "@/components/legal-modal";
import { AnimatePresence, motion } from "motion/react";

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
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
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
            className="h-9 w-auto object-contain sm:h-10 dark:invert dark:brightness-125"
          />
        </div>

        <div className="w-full max-w-[25rem]">
          <div className="flex flex-col gap-6 sm:gap-7">
            <Link
              href="/peta-publik"
              prefetch={true}
              onClick={() => setIsNavigatingBack(true)}
              className="animate-element animate-delay-100 inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {isNavigatingBack ? (
                <>
                  <span className="size-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden="true" />
                  <span>Membuka Peta...</span>
                </>
              ) : (
                <>
                  <ArrowLeftIcon className="size-3.5" />
                  <span>Kembali ke Peta Publik</span>
                </>
              )}
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
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="rounded-sm text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] cursor-pointer font-medium"
                >
                  Lupa sandi?
                </button>
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
            role="img"
            aria-label="Pusat Kendali Operasi SiagaKita"
          />
        </section>
      ) : null}

      {/* Modal Bantuan Pemulihan Kata Sandi */}
      <AnimatePresence>
        {forgotModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-text">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setForgotModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground"
              role="dialog"
              aria-modal="true"
              aria-labelledby="forgot-password-title"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <InfoCircledIcon className="size-5" />
                  </div>
                  <div>
                    <h2 id="forgot-password-title" className="text-base font-semibold">Pemulihan Akun Petugas</h2>
                    <p className="text-xs text-muted-foreground">Protokol Keamanan Operasional</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Tutup dialog"
                >
                  <Cross2Icon className="size-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-[13px] leading-relaxed text-muted-foreground">
                <p>
                  Untuk menjaga integritas dan kerahasiaan ruang kendali bencana, reset kata sandi akun operasional dilakukan secara terverifikasi melalui pihak berwenang.
                </p>
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-1.5 text-xs text-foreground">
                  <p className="font-semibold text-foreground">Kontak Bantuan Pemulihan:</p>
                  <p>• Administrator BPBD di unit posko wilayah Anda</p>
                  <p>• Tim Pusdatin: <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">pusdatin@siagakita.local</code></p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="w-full sm:w-auto rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Kembali ke Halaman Masuk
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
