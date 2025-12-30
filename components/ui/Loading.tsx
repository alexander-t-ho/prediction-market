export interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function Loading({ size = "md", text }: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`
          animate-spin rounded-full border-accent-primary border-t-transparent
          ${sizeClasses[size]}
        `}
      ></div>
      {text && <p className="text-sm text-text-secondary">{text}</p>}
    </div>
  );
}
