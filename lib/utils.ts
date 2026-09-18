import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function formatPercent(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`;
}

export function formatScore(value: number) {
  return Math.round(value).toString();
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function average(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
