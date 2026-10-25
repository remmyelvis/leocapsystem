import * as React from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

// One look for every hint in the app (it replaces the browser's own `title` tooltips, which wait over a second, cannot be
// styled, never show for the keyboard and vanish on disabled buttons). It opens on hover and on keyboard focus, closes on
// Escape or click, flips to the other side near a screen edge, and sits above dialogs.

/** Mount once near the top: a shared delay, so moving from one icon to the next shows the next hint at once. */
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Provider delay={350} closeDelay={60} timeout={500}>
      {children}
    </Tooltip.Provider>
  );
}

interface TipProps {
  /** What to say. Nothing (empty, undefined, false) means no tooltip at all. */
  label: React.ReactNode;
  /** The one element the hint belongs to; it keeps its own props and handlers. */
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  /** Only when the element's text is actually cut off (truncated names and emails, clamped file names). */
  whenClipped?: boolean;
  /** Put the hint on a wrapper: for a disabled button, which receives no pointer events of its own. */
  wrap?: boolean;
}

/** An icon-only control must still carry an aria-label: the tooltip is a visual hint, not its accessible name. */
export function Tip({ label, children, side = "top", align = "center", whenClipped = false, wrap = false }: TipProps) {
  if (!label) return children;

  const trigger = wrap ? <span className="inline-flex [&>*:disabled]:pointer-events-none">{children}</span> : children;

  return (
    <Tooltip.Root
      onOpenChange={(open, details) => {
        if (!open || !whenClipped) return;
        const el = details.trigger as HTMLElement | undefined;
        // fully visible text needs no hint: stay closed
        if (el && !(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) details.cancel();
      }}
    >
      <Tooltip.Trigger render={trigger} />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side} align={align} sideOffset={9} collisionPadding={10} className="z-[70]">
          <Tooltip.Popup
            className={cn(
              "relative max-w-[18rem] origin-[var(--transform-origin)] rounded-lg border border-white/10 bg-[#081430] px-2.5 py-1.5",
              "text-[12px] font-medium leading-snug text-white shadow-lg shadow-black/25 [overflow-wrap:anywhere]",
              "transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            )}
          >
            <Tooltip.Arrow
              className={cn(
                "relative block h-[6px] w-3 overflow-clip",
                "data-[side=bottom]:top-[-6px] data-[side=top]:bottom-[-6px] data-[side=top]:rotate-180",
                "data-[side=left]:right-[-9px] data-[side=left]:rotate-90 data-[side=right]:left-[-9px] data-[side=right]:-rotate-90",
                "before:absolute before:bottom-0 before:left-1/2 before:h-[calc(6px*sqrt(2))] before:w-[calc(6px*sqrt(2))] before:border before:border-white/10 before:bg-[#081430] before:content-['']",
                "before:[transform:translate(-50%,50%)_rotate(45deg)]",
              )}
            />
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
