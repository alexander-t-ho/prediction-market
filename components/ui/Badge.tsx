import { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "danger" | "warning" | "info";
  size?: "sm" | "md" | "lg";
}

export function Badge({
  variant = "default",
  size = "md",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const variantClasses = {
    default: "bg-background-elevated text-text-primary",
    success: "bg-positive/20 text-positive",
    danger: "bg-negative/20 text-negative",
    warning: "bg-blind-period/20 text-blind-period",
    info: "bg-accent-primary/20 text-accent-primary",
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </span>
  );
}
