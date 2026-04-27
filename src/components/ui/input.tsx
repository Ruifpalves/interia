import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, label, hint, error, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name ?? Math.random().toString(36).slice(2);
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs text-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={cn("input-base", error && "border-[var(--color-danger)]", className)}
        {...rest}
      />
      {hint && !error && <span className="text-xs text-muted">{hint}</span>}
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
});

export function Textarea({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  const inputId = id ?? rest.name ?? Math.random().toString(36).slice(2);
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs text-muted">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn("input-base min-h-24 resize-y", error && "border-[var(--color-danger)]", className)}
        {...rest}
      />
      {hint && !error && <span className="text-xs text-muted">{hint}</span>}
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}
