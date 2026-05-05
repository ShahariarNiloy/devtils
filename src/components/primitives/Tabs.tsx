"use client";

import * as Radix from "@radix-ui/react-tabs";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Tabs = Radix.Root;

const TabsList = forwardRef<HTMLDivElement, Radix.TabsListProps>(
  ({ className, ...rest }, ref) => (
    <Radix.List
      ref={ref}
      className={cn(
        "inline-flex h-9 items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-1",
        className,
      )}
      {...rest}
    />
  ),
);
TabsList.displayName = "TabsList";

const TabsTrigger = forwardRef<HTMLButtonElement, Radix.TabsTriggerProps>(
  ({ className, ...rest }, ref) => (
    <Radix.Trigger
      ref={ref}
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-md px-3 text-xs font-medium text-text-muted transition-colors",
        "hover:text-text data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-sm",
        className,
      )}
      {...rest}
    />
  ),
);
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = forwardRef<HTMLDivElement, Radix.TabsContentProps>(
  ({ className, ...rest }, ref) => (
    <Radix.Content
      ref={ref}
      className={cn("mt-3 outline-none", className)}
      {...rest}
    />
  ),
);
TabsContent.displayName = "TabsContent";

export { TabsList, TabsTrigger, TabsContent };
