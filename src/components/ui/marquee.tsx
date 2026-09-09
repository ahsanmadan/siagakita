import * as React from "react";
import { cn } from "@/lib/utils";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  pauseOnHover?: boolean;
  paused?: boolean;
  direction?: "left" | "right";
  speed?: number;
}

export function Marquee({
  children,
  pauseOnHover = true,
  paused = false,
  direction = "left",
  speed = 30,
  className,
  style,
  ...props
}: MarqueeProps) {
  return (
    <div
      className={cn("w-full overflow-hidden z-10 select-none", className)}
      style={style}
      {...props}
    >
      <div className="relative flex w-full overflow-hidden py-1.5">
        <div
          className={cn(
            "flex w-max shrink-0 items-center gap-6",
            direction === "left" ? "animate-marquee" : "animate-marquee-reverse",
            pauseOnHover && "hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]",
            paused && "[animation-play-state:paused]!",
            "motion-reduce:animate-none"
          )}
          style={{
            "--duration": `${speed}s`,
            animationPlayState: paused ? "paused" : undefined,
          } as React.CSSProperties}
        >
          {children}
          {children}
        </div>
      </div>
    </div>
  );
}
