"use client";

import {
  Group,
  Panel,
  Separator,
  type GroupProps,
  type PanelProps,
  type SeparatorProps,
} from "react-resizable-panels";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/cn";

interface PanelGroupProps extends Omit<GroupProps, "orientation"> {
  direction?: "horizontal" | "vertical";
}

// Group ships an inline `style={{ height: "100%" }}` which would beat any
// Tailwind className. We wrap it in a sizing div so the consumer's height
// className lands on the wrapper and Group fills 100% of that.
export const ResizablePanelGroup = ({ className, direction = "horizontal", children, ...rest }: PanelGroupProps) => (
  <div className={cn("w-full", className)}>
    <Group orientation={direction} {...rest}>
      {children}
    </Group>
  </div>
);

/**
 * Forward a numeric `defaultSize` to inline `flex-grow` so the panel renders
 * with the right split from the very first server-rendered paint. Without
 * this, the library only writes the layout into inline styles after a
 * client-side `useLayoutEffect` — so SSR shows the CSS fallback (equal
 * split) and the handle visibly shifts when the library hydrates. Inline
 * beats the `[data-panel]` attribute-selector rule in globals.css, so this
 * overrides the fallback during SSR. The library still owns sizing
 * post-mount.
 *
 * String-format defaultSize (e.g. `"68%"`) is accepted by the library but
 * isn't a valid `flex-grow` value, so the forwarding is skipped for those.
 * Those panels fall back to the CSS equal-split during SSR and snap into
 * their declared size on hydration.
 */
export const ResizablePanel = ({ defaultSize, style, ...rest }: PanelProps) => (
  <Panel
    defaultSize={defaultSize}
    style={
      typeof defaultSize === "number"
        ? { flexGrow: defaultSize, flexShrink: 1, flexBasis: 0, ...style }
        : style
    }
    {...rest}
  />
);

interface ResizableHandleProps extends SeparatorProps {
  withHandle?: boolean;
}

// Library applies aria-orientation automatically:
//   horizontal group → vertical separator (the line is upright)
//   vertical   group → horizontal separator (the line is flat)
export const ResizableHandle = ({
  withHandle,
  className,
  ...rest
}: ResizableHandleProps) => (
  <Separator
    className={cn(
      "group relative flex items-center justify-center bg-border-subtle",
      "transition-colors hover:bg-border-strong active:bg-brand",
      // Vertical separator (horizontal group) — thin column, expand hit area horizontally
      "aria-[orientation=vertical]:w-px aria-[orientation=vertical]:h-full",
      "aria-[orientation=vertical]:after:absolute aria-[orientation=vertical]:after:inset-y-0 aria-[orientation=vertical]:after:left-1/2 aria-[orientation=vertical]:after:w-2 aria-[orientation=vertical]:after:-translate-x-1/2 aria-[orientation=vertical]:after:cursor-col-resize",
      // Horizontal separator (vertical group) — thin row, expand hit area vertically
      "aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full",
      "aria-[orientation=horizontal]:after:absolute aria-[orientation=horizontal]:after:inset-x-0 aria-[orientation=horizontal]:after:top-1/2 aria-[orientation=horizontal]:after:h-2 aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:cursor-row-resize",
      className,
    )}
    {...rest}
  >
    {withHandle && (
      <div className="z-10 flex items-center justify-center rounded-sm border border-border bg-surface text-text-faint group-aria-[orientation=vertical]:h-7 group-aria-[orientation=vertical]:w-3 group-aria-[orientation=horizontal]:h-3 group-aria-[orientation=horizontal]:w-7 group-aria-[orientation=horizontal]:rotate-90">
        <GripVertical size={10} />
      </div>
    )}
  </Separator>
);
