"use client";

import * as Radix from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const DropdownMenu = Radix.Root;
export const DropdownMenuTrigger = Radix.Trigger;
export const DropdownMenuPortal = Radix.Portal;
export const DropdownMenuGroup = Radix.Group;
export const DropdownMenuRadioGroup = Radix.RadioGroup;
export const DropdownMenuSub = Radix.Sub;

const DropdownMenuContent = forwardRef<HTMLDivElement, Radix.DropdownMenuContentProps>(
  ({ className, sideOffset = 6, ...rest }, ref) => (
    <DropdownMenuPortal>
      <Radix.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-45 rounded-xl border border-border bg-surface p-1 shadow-[0_4px_12px_-6px_rgba(164,114,81,0.2)]",
          "data-[state=open]:animate-[scale-in_140ms_ease-out] data-[state=closed]:animate-[fade-out_100ms_ease-in]",
          className,
        )}
        {...rest}
      />
    </DropdownMenuPortal>
  ),
);
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = forwardRef<HTMLDivElement, Radix.DropdownMenuItemProps>(
  ({ className, ...rest }, ref) => (
    <Radix.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-xs-plus text-text-muted outline-none",
        "data-[highlighted]:bg-surface-warm data-[highlighted]:text-terracotta-deep",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className,
      )}
      {...rest}
    />
  ),
);
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuLabel = forwardRef<HTMLDivElement, Radix.DropdownMenuLabelProps>(
  ({ className, ...rest }, ref) => (
    <Radix.Label
      ref={ref}
      className={cn(
        "px-2.5 py-1.5 text-2xs font-medium uppercase tracking-wider text-text-faint",
        className,
      )}
      {...rest}
    />
  ),
);
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = forwardRef<HTMLDivElement, Radix.DropdownMenuSeparatorProps>(
  ({ className, ...rest }, ref) => (
    <Radix.Separator ref={ref} className={cn("my-1 h-px bg-border", className)} {...rest} />
  ),
);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuCheckboxItem = forwardRef<HTMLDivElement, Radix.DropdownMenuCheckboxItemProps>(
  ({ className, children, ...rest }, ref) => (
    <Radix.CheckboxItem
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-7 pr-2.5 text-xs-plus outline-none",
        "data-[highlighted]:bg-surface-warm data-[highlighted]:text-terracotta-deep",
        className,
      )}
      {...rest}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <Radix.ItemIndicator>
          <Check size={12} className="text-terracotta" />
        </Radix.ItemIndicator>
      </span>
      {children}
    </Radix.CheckboxItem>
  ),
);
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

export {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
};
