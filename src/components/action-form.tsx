"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { FormStateMessage } from "@/components/form-state-message";
import { initialActionState, type ActionResult } from "@/lib/action-state";
import { cn } from "@/lib/utils";

export function ActionForm({
  action,
  children,
  className,
  messageClassName,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  messageClassName?: string;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(async (_previousState: ActionResult, formData: FormData) => action(formData), initialActionState);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      onSuccessRef.current?.();
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className={cn("grid gap-4", className)}>
      {children}
      <FormStateMessage state={state} className={messageClassName} />
    </form>
  );
}
