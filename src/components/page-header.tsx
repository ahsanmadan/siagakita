import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  section = "Operasional",
  eyebrow,
  status,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  section?: string;
  eyebrow?: string;
  status?: string;
}) {
  const hasMeta = Boolean(eyebrow || status);

  return (
    <header className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <Breadcrumb className="mb-3 hidden sm:block">
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem><BreadcrumbLink asChild><Link href="/dashboard" className="inline-flex min-h-8 items-center">SiagaKita</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{section}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {hasMeta ? <div className="flex flex-wrap items-center gap-2">
          {eyebrow ? <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</p> : null}
          {status ? <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/8 text-primary">{status}</Badge> : null}
        </div> : null}
        <h1 className={cn("text-balance text-2xl font-semibold tracking-[-0.035em] sm:text-3xl", hasMeta && "mt-1")}>{title}</h1>
        <p className="mt-2 max-w-3xl text-pretty text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">{actions}</div> : null}
    </header>
  );
}
