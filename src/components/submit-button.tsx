"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ActionButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive";
export type ActionButtonSize = "default" | "xs" | "sm" | "lg";

export function SubmitButton({
  children,
  pendingLabel = "Memproses...",
  variant = "default",
  size = "default",
  icon,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  icon?: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      className={cn(
        "whitespace-nowrap active:translate-y-px",
        size === "default" || size === "lg" ? "min-h-11" : null,
        className,
      )}
    >
      {pending ? <LoaderCircle className="animate-spin" /> : icon}
      {pending ? pendingLabel : children}
    </Button>
  );
}
