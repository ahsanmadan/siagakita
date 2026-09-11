"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const pillRef = React.useRef<HTMLSpanElement>(null)

  const movePill = React.useCallback((animate: boolean) => {
    const list = listRef.current
    const pill = pillRef.current
    if (!list || !pill) return

    const activeTrigger = list.querySelector<HTMLElement>(
      '[data-state="active"][role="tab"], [aria-selected="true"][role="tab"]'
    )
    if (!activeTrigger) {
      pill.style.opacity = "0"
      return
    }

    const left = activeTrigger.offsetLeft
    const top = activeTrigger.offsetTop
    const width = activeTrigger.offsetWidth
    const height = activeTrigger.offsetHeight

    if (!animate) {
      const prev = pill.style.transition
      pill.style.transition = "none"
      pill.style.transform = `translate3d(${left}px, ${top}px, 0)`
      pill.style.width = `${width}px`
      pill.style.height = `${height}px`
      pill.style.opacity = "1"
      void pill.offsetWidth
      pill.style.transition = prev
    } else {
      pill.style.transform = `translate3d(${left}px, ${top}px, 0)`
      pill.style.width = `${width}px`
      pill.style.height = `${height}px`
      pill.style.opacity = "1"
    }
  }, [])

  React.useEffect(() => {
    const list = listRef.current
    if (!list) return

    const frameId = window.requestAnimationFrame(() => movePill(false))

    const observer = new MutationObserver(() => {
      movePill(true)
    })
    observer.observe(list, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "aria-selected"],
    })

    const onResize = () => movePill(false)
    window.addEventListener("resize", onResize)

    return () => {
      window.cancelAnimationFrame(frameId)
      observer.disconnect()
      window.removeEventListener("resize", onResize)
    }
  }, [movePill])

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), "relative", className)}
      {...props}
    >
      <span
        ref={pillRef}
        data-slot="tabs-pill"
        className={cn(
          "pointer-events-none absolute left-0 top-0 opacity-0 z-0 will-change-[transform,width]",
          variant === "line"
            ? "h-0.5 bg-foreground bottom-0 top-auto rounded-none transition-[transform,width] duration-[var(--tabs-dur,250ms)] ease-[var(--tabs-ease,cubic-bezier(0.22,1,0.36,1))]"
            : "rounded-md bg-background shadow-xs border border-border/40 transition-[transform,width,height] duration-[var(--tabs-dur,250ms)] ease-[var(--tabs-ease,cubic-bezier(0.22,1,0.36,1))]"
        )}
        aria-hidden="true"
      />
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-1 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-colors duration-[var(--tabs-dur,250ms)] ease-[var(--tabs-ease,cubic-bezier(0.22,1,0.36,1))] group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:text-foreground data-[state=active]:bg-transparent shadow-none",
        "dark:text-muted-foreground dark:hover:text-foreground dark:data-[state=active]:text-foreground",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
