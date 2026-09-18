"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export function TooltipProvider({
  children,
  delayDuration = 200,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration}>{children}</TooltipPrimitive.Provider>;
}

export function Tooltip({ children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>;
}

export function TooltipTrigger({
  children,
  asChild = true,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return (
    <TooltipPrimitive.Trigger asChild={asChild} {...props}>
      {children}
    </TooltipPrimitive.Trigger>
  );
}

export function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 rounded-md border border-white/10 bg-[#121821] px-3 py-2 text-xs text-white shadow-md duration-200",
          className
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
