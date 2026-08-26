"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { FormStateMessage } from "@/components/form-state-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState, type ActionResult } from "@/lib/action-state";

export function MutationAction({
  action,
  label,
  pendingLabel,
  fields,
  variant = "default",
  className,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  label: string;
  pendingLabel?: string;
  fields?: Record<string, string | number>;
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
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
    <form action={formAction} className={className}>
      {fields
        ? Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)
        : null}
      <SubmitButton variant={variant} pendingLabel={pendingLabel}>{label}</SubmitButton>
      <FormStateMessage state={state} className="mt-2" />
    </form>
  );
}
