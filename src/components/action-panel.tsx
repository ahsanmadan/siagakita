import type { ReactNode } from "react";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationalCard } from "@/components/operational-ui";
import { cn } from "@/lib/utils";

export function ActionPanel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <OperationalCard className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b py-5">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </OperationalCard>
  );
}
