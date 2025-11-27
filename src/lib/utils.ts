import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte texto para Title Case (primeira letra de cada palavra maiúscula)
 * Trata: trims, múltiplos espaços, strings vazias/null
 */
export function toTitleCase(text: string | null | undefined): string {
  if (!text) return "";
  
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')  // Normaliza múltiplos espaços
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
