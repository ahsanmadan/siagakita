"use client";

import * as React from "react";
import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CheckCircledIcon, EyeClosedIcon, EyeOpenIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { UserPlus } from "lucide-react";
import { signUpAction, type SignUpState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="t-glass-field mt-1.5 rounded-xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-primary/70 focus-within:bg-primary/10">
    {children}
  </div>
);

const ORG_SUGGESTIONS = [
  "BPBD",
  "PMI",
  "Tagana",
  "Basarnas",
  "TNI / Polri",
  "Dinas Sosial",
  "Relawan Kampus",
  "Relawan Mandiri",
];

const ROLES = [
  {
    id: "field_officer",
    title: "Petugas Lapangan",
    desc: "Melaporkan asesmen situasi, kerusakan, dan koordinasi evakuasi lapangan.",
  },
  {
    id: "shelter_manager",
    title: "Pengelola Posko",
    desc: "Memperbarui populasi pengungsi, kelompok rentan, dan pengajuan kebutuhan posko.",
  },
  {
    id: "warehouse_manager",
    title: "Pengelola Gudang",
    desc: "Mengelola stok logistik darurat, alokasi armada, dan distribusi bantuan.",
  },
] as const;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [organization, setOrganization] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("field_officer");
  const [state, formAction, pending] = useActionState(signUpAction, {});

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center bg-background px-4 pb-12 pt-16 sm:px-6 sm:pt-24 lg:px-8">
      {/* Logo SiagaKita di Kiri Atas */}
      <div className="absolute left-4 top-4 sm:left-10 sm:top-8 z-20">
        <Link href="/peta-publik" className="inline-block transition-opacity hover:opacity-85">
          <img
            src="/brand/logo-siagakita.png"
            alt="Logo SiagaKita"
            className="h-7 sm:h-9 w-auto object-contain dark:invert dark:brightness-125"
          />
        </Link>
      </div>

      <div className="w-full max-w-4xl space-y-5 sm:space-y-6">
          <div className="flex flex-col-reverse items-start gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground active:underline"
            >
              <ArrowLeftIcon className="size-3.5" />
              <span>Kembali ke Halaman Masuk</span>
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <UserPlus className="size-3.5 shrink-0" />
              Pendaftaran Personel & Relawan
            </div>
          </div>

          {state.success ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircledIcon className="size-6 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-emerald-950 dark:text-emerald-200">
                    Pendaftaran Berhasil Dikirim!
                  </h3>
                  <p className="text-sm text-emerald-900/90 dark:text-emerald-300 leading-relaxed">
                    {state.message}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border/80 bg-background/80 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Langkah Selanjutnya:</p>
                <p>1. Koordinator BPBD akan memvalidasi instansi dan surat tugas Anda di antrean verifikasi.</p>
                <p>2. Setelah disetujui, Anda dapat langsung login menggunakan email dan kata sandi yang Anda buat.</p>
              </div>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors w-full"
                >
                  Ke Halaman Masuk
                </Link>
              </div>
            </div>
          ) : (
            <form action={formAction} className="space-y-6">
              {state.error ? (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive">
                  <InfoCircledIcon className="size-4 shrink-0" />
                  <span>{state.error}</span>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Kolom Kiri: Identitas & Akses Masuk */}
                <div className="space-y-4">
                  {/* Nama Lengkap */}
                  <div>
                    <label htmlFor="fullName" className="text-xs font-medium text-foreground/80">
                      Nama Lengkap
                    </label>
                    <GlassInputWrapper>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        placeholder="Contoh: Rian Pratama, S.T."
                        className="w-full rounded-xl bg-transparent px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                    </GlassInputWrapper>
                  </div>

                  {/* Email & No HP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="email" className="text-xs font-medium text-foreground/80">
                        Email Operasional
                      </label>
                      <GlassInputWrapper>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          placeholder="nama@organisasi.id"
                          className="w-full rounded-xl bg-transparent px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                      </GlassInputWrapper>
                    </div>
                    <div>
                      <label htmlFor="phone" className="text-xs font-medium text-foreground/80">
                        No. WhatsApp / HP
                      </label>
                      <GlassInputWrapper>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          required
                          placeholder="081234567890"
                          className="w-full rounded-xl bg-transparent px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                      </GlassInputWrapper>
                    </div>
                  </div>

                  {/* Kata Sandi & Konfirmasi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="password" className="text-xs font-medium text-foreground/80">
                        Kata Sandi
                      </label>
                      <GlassInputWrapper>
                        <div className="relative">
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={6}
                            placeholder="Minimal 6 karakter"
                            className="w-full rounded-xl bg-transparent px-3.5 py-2.5 pr-9 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeClosedIcon className="size-4" /> : <EyeOpenIcon className="size-4" />}
                          </button>
                        </div>
                      </GlassInputWrapper>
                    </div>
                    <div>
                      <label htmlFor="confirmPassword" className="text-xs font-medium text-foreground/80">
                        Konfirmasi Sandi
                      </label>
                      <GlassInputWrapper>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={6}
                          placeholder="Ketik ulang sandi"
                          className="w-full rounded-xl bg-transparent px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                      </GlassInputWrapper>
                    </div>
                  </div>
                </div>

                {/* Kolom Kanan: Organisasi & Peran */}
                <div className="space-y-4">
                  {/* Instansi / Lembaga */}
                  <div>
                    <label htmlFor="organization" className="text-xs font-medium text-foreground/80">
                      Instansi / Lembaga / Organisasi
                    </label>
                    <GlassInputWrapper>
                      <input
                        id="organization"
                        name="organization"
                        type="text"
                        required
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="Contoh: PMI Kab. Agam / Tagana / Relawan"
                        className="w-full rounded-xl bg-transparent px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                    </GlassInputWrapper>
                    {/* Quick chip selector */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ORG_SUGGESTIONS.map((org) => (
                        <button
                          key={org}
                          type="button"
                          onClick={() => setOrganization(org)}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-xs sm:text-[11px] font-medium transition-transform active:scale-95 hover:bg-muted",
                            organization === org ? "border-primary bg-primary/10 text-primary font-semibold" : "text-muted-foreground"
                          )}
                        >
                          {org}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Role yang Diajukan */}
                  <div>
                    <label className="text-xs font-medium text-foreground/80">
                      Peran / Tugas yang Diajukan
                    </label>
                    <input type="hidden" name="requestedRole" value={selectedRole} />
                    <div className="mt-1.5 grid gap-2">
                      {ROLES.map((role) => (
                        <div
                          key={role.id}
                          onClick={() => setSelectedRole(role.id)}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border p-3 select-none transition-all active:scale-[0.99]",
                            selectedRole === role.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                              : "border-border/80 bg-card hover:bg-muted/40"
                          )}
                        >
                          <input
                            type="radio"
                            name="roleRadio"
                            checked={selectedRole === role.id}
                            onChange={() => setSelectedRole(role.id)}
                            className="mt-0.5 size-4 text-primary"
                          />
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-foreground">{role.title}</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{role.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Catatan Penugasan / No Identitas */}
                  <div>
                    <label htmlFor="assignmentNote" className="text-xs font-medium text-foreground/80">
                      Catatan Penugasan / KTA / No. Surat Tugas <span className="text-muted-foreground font-normal">(Opsional)</span>
                    </label>
                    <GlassInputWrapper>
                      <input
                        id="assignmentNote"
                        name="assignmentNote"
                        type="text"
                        placeholder="Contoh: Penugasan Posko Lapangan Sektor 2"
                        className="w-full rounded-xl bg-transparent px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                    </GlassInputWrapper>
                  </div>
                </div>
              </div>

              {/* Tombol Submit & Link Masuk */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full min-h-[48px] rounded-xl bg-primary py-3 text-base sm:text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50"
                >
                  {pending ? "Mengirim Pendaftaran..." : "Ajukan Pendaftaran Akun"}
                </button>

                <div className="text-center text-xs text-muted-foreground">
                  Sudah memiliki akun resmi?{" "}
                  <Link href="/login" className="font-semibold text-primary hover:underline active:underline">
                    Masuk di sini
                  </Link>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
  );
}
