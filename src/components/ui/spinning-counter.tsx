"use client";

import { useEffect, useRef, useState } from "react";

const __TRANSITION_STYLES = `
:root {
  --reel-dur: 1400ms;
  --reel-cell: 56px;
  --reel-spin-blur: 3px;
  --reel-stagger: 90ms;
  --reel-ease: cubic-bezier(0.16, 1, 0.3, 1);
}

.t-reel {
  display: inline-flex;
  align-items: center;
  height: var(--reel-cell);
  font-variant-numeric: tabular-nums;
}

.t-reel-col {
  position: relative;
  height: var(--reel-cell);
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%);
}

.t-reel-strip {
  display: flex;
  flex-direction: column;
  will-change: transform, filter;
}

.t-reel-digit {
  height: var(--reel-cell);
  display: flex;
  align-items: center;
  justify-content: center;
}

.t-reel-sep {
  height: var(--reel-cell);
  display: flex;
  align-items: center;
  justify-content: center;
  padding-inline: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .t-reel-strip {
    transition: none !important;
    filter: none !important;
  }
}
`;

if (typeof document !== "undefined" && !document.getElementById("transitions-spinning-counter")) {
  const __style = document.createElement("style");
  __style.id = "transitions-spinning-counter";
  __style.textContent = __TRANSITION_STYLES;
  document.head.appendChild(__style);
}

const SPINS = 3;
const CELL = 56;
const DUR = 1400;
const STAGGER = 90;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export function SpinningCounter({
  target = 100,
  className = "",
  autoSpin = true,
  prefix = "",
  suffix = "",
}: {
  target?: number;
  className?: string;
  autoSpin?: boolean;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasSpun, setHasSpun] = useState(false);

  function build(str: string) {
    if (!ref.current) return [];
    ref.current.innerHTML = "";
    const strips: Array<{ strip: HTMLElement; digit: number }> = [];

    [...str].forEach((ch) => {
      if (ch < "0" || ch > "9") {
        const sep = document.createElement("span");
        sep.className = "t-reel-sep";
        sep.textContent = ch;
        ref.current?.appendChild(sep);
        return;
      }
      const col = document.createElement("span");
      col.className = "t-reel-col";
      const strip = document.createElement("span");
      strip.className = "t-reel-strip";
      for (let k = 0; k < (SPINS + 1) * 10 + 1; k++) {
        const cell = document.createElement("span");
        cell.className = "t-reel-digit";
        cell.textContent = String(k % 10);
        strip.appendChild(cell);
      }
      col.appendChild(strip);
      ref.current?.appendChild(col);
      strips.push({ strip, digit: +ch });
    });
    return strips;
  }

  function runSpin() {
    if (!ref.current) return;
    const strips = build(Math.round(target).toLocaleString("id-ID"));
    strips.forEach(({ strip }) => {
      strip.style.transition = "none";
      strip.style.transform = "translateY(0)";
    });
    void ref.current.offsetWidth;
    strips.forEach(({ strip, digit }, i) => {
      strip.style.transition = `transform ${DUR}ms ${EASE} ${i * STAGGER}ms`;
      strip.style.transform = `translateY(-${(SPINS * 10 + digit) * CELL}px)`;
    });
  }

  useEffect(() => {
    if (autoSpin) {
      runSpin();
    } else {
      const strips = build(Math.round(target).toLocaleString("id-ID"));
      strips.forEach(({ strip, digit }) => {
        strip.style.transform = `translateY(-${(SPINS * 10 + digit) * CELL}px)`;
      });
    }
  }, [target, autoSpin]);

  return (
    <div className={`inline-flex items-center gap-1 font-bold ${className}`}>
      {prefix ? <span>{prefix}</span> : null}
      <div ref={ref} className="t-reel" aria-label={String(target)} />
      {suffix ? <span>{suffix}</span> : null}
    </div>
  );
}
