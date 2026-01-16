import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeUrl(input: string | undefined | null): string | null {
  if (!input) return null;
  try {
    const u = new URL(input);
    return u.toString();
  } catch {
    try {
      const u = new URL(`https://${input}`);
      return u.toString();
    } catch {
      return null;
    }
  }
}

export function isValidUrl(input: string | undefined | null): boolean {
  return normalizeUrl(input) !== null;
}
