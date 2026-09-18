import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type MotionDirection = "up" | "down" | "left" | "right" | "none";

const directionClass: Record<MotionDirection, string> = {
  up: "slide-in-from-bottom-3",
  down: "slide-in-from-top-3",
  left: "slide-in-from-right-3",
  right: "slide-in-from-left-3",
  none: "",
};

/** Minimal shadcn-style enter animation (tw-animate-css). */
export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 500,
  direction = "up",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: MotionDirection;
  as?: "div" | "section" | "header" | "main" | "span";
}) {
  return (
    <Tag
      className={cn(
        "animate-in fade-in-0 fill-mode-both",
        directionClass[direction],
        className
      )}
      style={
        {
          animationDuration: `${duration}ms`,
          animationDelay: delay ? `${delay}ms` : undefined,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}

/** Stagger children with equal delay steps — keeps motion calm and professional. */
export function Stagger({
  children,
  className,
  step = 70,
  base = 40,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  step?: number;
  base?: number;
  direction?: MotionDirection;
}) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <div className={cn(className)}>
      {items.map((child, i) => (
        <FadeIn key={i} delay={base + i * step} direction={direction}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
}
