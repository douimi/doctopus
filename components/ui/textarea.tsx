import * as React from "react"

import { fieldClasses } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldClasses,
        "flex field-sizing-content min-h-20 py-2 leading-(--text-body--line-height) read-only:bg-muted/50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
