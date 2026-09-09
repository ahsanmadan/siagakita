"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { FormStateMessage } from "@/components/form-state-message";
import { SubmitButton, type ActionButtonSize, type ActionButtonVariant } from "@/components/submit-button";
import { initialActionState, type ActionResult } from "@/lib/action-state";
import { cn } from "@/lib/utils";

export function MutationAction({
  action,
  label,
  pendingLabel,
  fields,
  variant = "default",
  size = "default",
  icon,
  showMessage = true,
  className,
  buttonClassName,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  label: string;
  pendingLabel?: string;
  fields?: Record<string, string | number>;
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  icon?: React.ReactNode;
  showMessage?: boolean;
  className?: string;
  buttonClassName?: string;
}) {
  const [state, formAction] = useActionState(async (_previousState: ActionResult, formData: FormData) => action(formData), initialActionState);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className={cn("inline-flex", className)}>
      {fields
        ? Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)
        : null}
      <SubmitButton variant={variant} size={size} icon={icon} pendingLabel={pendingLabel} className={buttonClassName}>{label}</SubmitButton>
      {showMessage ? <FormStateMessage state={state} className="mt-2" /> : null}
    </form>
  );
}
