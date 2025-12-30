export interface ContrarianBadgeProps {
  size?: "sm" | "md" | "lg";
  showBonus?: boolean;
}

export function ContrarianBadge({ size = "md", showBonus = false }: ContrarianBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-lg bg-contrarian/20 font-medium text-contrarian
        ${sizeClasses[size]}
      `}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
      <span>Contrarian</span>
      {showBonus && <span className="font-mono font-semibold">+25%</span>}
    </div>
  );
}
