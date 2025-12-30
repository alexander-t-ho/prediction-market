import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", fullWidth = false, className = "", children, ...props },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-medium transition-all rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
      primary: "bg-accent-primary text-white hover:opacity-90",
      secondary: "bg-background-elevated text-text-primary hover:bg-background-secondary",
      outline:
        "border border-border bg-transparent text-text-primary hover:bg-background-elevated",
      ghost: "bg-transparent text-text-primary hover:bg-background-elevated",
      danger: "bg-negative text-white hover:opacity-90",
    };

    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    const classes = `
      ${baseClasses}
      ${variantClasses[variant]}
      ${sizeClasses[size]}
      ${fullWidth ? "w-full" : ""}
      ${className}
    `.trim();

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
