import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Teach tailwind-merge that our custom type-scale tokens (declared in
// app/globals.css @theme) are font sizes. Without this it files
// `text-small` etc. as text colours, so `cn('text-small text-muted-foreground')`
// silently drops the size.
const twMerge = extendTailwindMerge({
  extend: {
    theme: { text: ["display", "title", "heading", "body", "small", "micro"] },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
