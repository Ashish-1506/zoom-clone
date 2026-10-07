import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, helperText, error, className, ...props },
  ref,
) {
  const messageId = error ? `${id}-error` : helperText ? `${id}-helper` : undefined;
  return (
    <label htmlFor={id} className="block">
      {label && <span className="mb-1.5 block text-sm font-bold text-zoom-text">{label}</span>}
      <input
        ref={ref}
        id={id}
        className={`min-h-11 w-full rounded-md border ${error ? "border-zoom-red" : "border-zoom-border"} bg-white px-3 py-2.5 text-sm text-zoom-text outline-none transition placeholder:text-zoom-muted focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20 ${className ?? ""}`}
        aria-invalid={Boolean(error)}
        aria-describedby={messageId}
        {...props}
      />
      {error && <span id={`${id}-error`} className="mt-1 block text-xs text-zoom-red">{error}</span>}
      {!error && helperText && <span id={`${id}-helper`} className="mt-1 block text-xs text-zoom-muted">{helperText}</span>}
    </label>
  );
});
