"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const __TRANSITION_STYLES = `
:root {
  --shake-distance: 8px;
  --shake-overshoot: 5px;
  --shake-dur-a: 80ms;
  --shake-dur-b: 60ms;
  --shake-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --revert-hold: 3000ms;
  --revert-dur: 280ms;
}

.t-input-wrap {
  width: 100%;
  display: block;
}

.t-input {
  transition: border-color 150ms ease-out, transform 150ms ease-out;
  will-change: transform;
}

.t-input.is-error {
  transition: border-color var(--revert-dur, 280ms) ease-out;
}

.t-input-wrap.is-error input {
  border-color: var(--destructive) !important;
  box-shadow: 0 0 0 1px var(--destructive) !important;
}

.t-input.is-shaking {
  animation: t-input-shake calc(
      var(--shake-dur-a) * 2 + var(--shake-dur-b) * 2
    ) linear;
}

@keyframes t-input-shake {
  0%      { transform: translateX(0);                                 animation-timing-function: var(--shake-ease); }
  28.57%  { transform: translateX(var(--shake-distance));             animation-timing-function: var(--shake-ease); }
  57.14%  { transform: translateX(calc(var(--shake-distance) * -1)); animation-timing-function: var(--shake-ease); }
  78.57%  { transform: translateX(var(--shake-overshoot));            animation-timing-function: var(--shake-ease); }
  100%    { transform: translateX(0); }
}

@media (prefers-reduced-motion: reduce) {
  .t-input { animation: none !important; transform: none !important; }
}
`;

if (typeof document !== "undefined" && !document.getElementById("transitions-p12")) {
  const __style = document.createElement("style");
  __style.id = "transitions-p12";
  __style.textContent = __TRANSITION_STYLES;
  document.head.appendChild(__style);
}

export function InputShake({
  children,
  trigger = 0,
  hasError = false,
  className,
  onCancel,
}: {
  children: ReactNode;
  trigger?: number;
  hasError?: boolean;
  className?: string;
  onCancel?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const [isErrorActive, setIsErrorActive] = useState(false);

  useEffect(() => {
    if (trigger > 0 && containerRef.current) {
      const el = containerRef.current;
      setIsErrorActive(true);
      el.classList.remove("is-shaking");
      void el.offsetWidth;
      el.classList.add("is-shaking");

      if (timerRef.current) window.clearTimeout(timerRef.current);
      const shakeMs =
        readMs("--shake-dur-a", 80) * 2 +
        readMs("--shake-dur-b", 60) * 2;
      const hold = readMs("--revert-hold", 3000);
      timerRef.current = window.setTimeout(() => {
        setIsErrorActive(false);
        timerRef.current = null;
      }, shakeMs + hold);
    }
  }, [trigger]);

  const handleInput = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsErrorActive(false);
    onCancel?.();
  };

  const errorState = hasError || isErrorActive;

  return (
    <div className={cn("t-input-wrap", errorState && "is-error", className)} onInput={handleInput}>
      <div
        ref={containerRef}
        className={cn("t-input", errorState && "is-error")}
      >
        {children}
      </div>
    </div>
  );
}

function readMs(name: string, fallback: number) {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name).trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}
