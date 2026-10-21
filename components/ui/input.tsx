import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * Shared field chrome for Input / Textarea / SelectTrigger. `text-base` on
 * mobile prevents iOS zoom-on-focus; md+ drops to the body size. Dark mode
 * is handled by the tokens, so there are no `dark:` overrides here.
 */
export const fieldClasses =
  "w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base text-foreground shadow-[0_1px_0_rgb(15_23_42/0.03)] transition-colors duration-(--duration-fast) outline-none placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/15 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground md:text-body"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        fieldClasses,
        "h-9 read-only:bg-muted/50 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-small file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
