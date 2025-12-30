import { InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={props.id} className="mb-1 block text-sm font-medium text-text-primary">
            {label}
          </label>
        )}

        <input
          ref={ref}
          className={`
            w-full rounded-lg border bg-background-secondary px-4 py-2
            text-text-primary placeholder-text-secondary
            transition-colors
            focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? "border-negative" : "border-border"}
            ${className}
          `.trim()}
          {...props}
        />

        {error && <p className="mt-1 text-sm text-negative">{error}</p>}

        {helperText && !error && <p className="mt-1 text-sm text-text-secondary">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
