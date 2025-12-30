import { HTMLAttributes, forwardRef } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "bordered";
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", padding = "md", className = "", children, ...props }, ref) => {
    const variantClasses = {
      default: "bg-background-secondary",
      elevated: "bg-background-elevated shadow-lg",
      bordered: "bg-background-secondary border border-border",
    };

    const paddingClasses = {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    };

    const classes = `
      ${variantClasses[variant]}
      ${paddingClasses[padding]}
      rounded-lg
      ${className}
    `.trim();

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
