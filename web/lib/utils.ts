import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fmtNumber = (v: number) =>
  v.toLocaleString(undefined, { maximumFractionDigits: 0 })

export const fmtMoney = (v: number) =>
  "LKR " + v.toLocaleString(undefined, { maximumFractionDigits: 0 })
