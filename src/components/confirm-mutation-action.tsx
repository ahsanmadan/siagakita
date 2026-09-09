"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MutationAction } from "@/components/mutation-action";
import { Button } from "@/components/ui/button";
import type { ActionButtonSize, ActionButtonVariant } from "@/components/submit-button";
import type { ActionResult } from "@/lib/action-state";
import { cn } from "@/lib/utils";

export function ConfirmMutationAction({
  action,
  label,
  title,
  description,
  consequence = "Aksi ini akan menyimpan perubahan ke database dan menulis audit log.",
  fields,
  variant = "default",
  size = "default",
  icon,
  triggerClassName,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  label: string;
  title: string;
  description: string;
  consequence?: string;
  fields: Record<string, string | number>;
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  icon?: React.ReactNode;
  triggerClassName?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn(
            "whitespace-nowrap",
            size === "default" || size === "lg" ? "min-h-11" : null,
            triggerClassName,
          )}
        >
          {icon}
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border bg-muted/60 p-3 text-sm leading-6 text-muted-foreground">
          {consequence}
        </div>
        <MutationAction action={action} label={label} fields={fields} />
      </DialogContent>
    </Dialog>
  );
}
