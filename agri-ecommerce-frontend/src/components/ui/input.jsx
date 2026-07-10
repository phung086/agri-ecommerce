import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

const LTR_INPUT_TYPES = new Set([
  "email",
  "tel",
  "text",
  "password",
  "search",
  "url",
  "number",
]);

function shouldForceLtr(type, inputMode, autoComplete) {
  const normalizedType = String(type || "text").toLowerCase();
  const normalizedInputMode = String(inputMode || "").toLowerCase();
  const normalizedAutoComplete = String(autoComplete || "").toLowerCase();

  return (
    LTR_INPUT_TYPES.has(normalizedType) ||
    ["email", "tel", "numeric", "decimal", "url", "search"].includes(normalizedInputMode) ||
    ["email", "username", "tel", "one-time-code"].includes(normalizedAutoComplete)
  );
}

function Input({
  className,
  type,
  dir,
  inputMode,
  autoComplete,
  style,
  ...props
}) {
  const forceLtr = shouldForceLtr(type, inputMode, autoComplete);

  return (
    <InputPrimitive
      type={type}
      dir={dir || (forceLtr ? "ltr" : undefined)}
      inputMode={inputMode}
      autoComplete={autoComplete}
      data-slot="input"
      data-agri-ltr-input={forceLtr ? "true" : undefined}
      style={
        forceLtr
          ? {
              direction: "ltr",
              unicodeBidi: "isolate",
              textAlign: "left",
              ...style,
            }
          : style
      }
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props} />
  );
}

export { Input }
