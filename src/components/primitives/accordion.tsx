"use client";

import * as Radix from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Accordion = Radix.Root;

export const AccordionItem = forwardRef<HTMLDivElement, Radix.AccordionItemProps>(
  ({ className, ...rest }, ref) => (
    <Radix.Item
      ref={ref}
      className={cn("border-b border-border-subtle last:border-0", className)}
      {...rest}
    />
  ),
);
AccordionItem.displayName = "AccordionItem";

export const AccordionTrigger = forwardRef<HTMLButtonElement, Radix.AccordionTriggerProps>(
  ({ className, children, ...rest }, ref) => (
    <Radix.Header asChild>
      <h4>
        <Radix.Trigger
          ref={ref}
          className={cn(
            "group flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-text-muted",
            "hover:bg-surface-2 hover:text-text data-[state=open]:text-text",
            className,
          )}
          {...rest}
        >
          {children}
          <ChevronDown
            size={12}
            className="transition-transform group-data-[state=open]:rotate-180"
          />
        </Radix.Trigger>
      </h4>
    </Radix.Header>
  ),
);
AccordionTrigger.displayName = "AccordionTrigger";

export const AccordionContent = forwardRef<HTMLDivElement, Radix.AccordionContentProps>(
  ({ className, children, ...rest }, ref) => (
    <Radix.Content
      ref={ref}
      className={cn(
        "overflow-hidden text-sm text-text-muted",
        "data-[state=open]:animate-[fade-in_180ms_ease-out]",
        className,
      )}
      {...rest}
    >
      <div className="px-3 pb-3 pt-1">{children}</div>
    </Radix.Content>
  ),
);
AccordionContent.displayName = "AccordionContent";
