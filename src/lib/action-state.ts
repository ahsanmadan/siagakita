export type ActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  retryAfter?: number;
};

export const initialActionState: ActionResult = {
  ok: false,
  message: "",
};
