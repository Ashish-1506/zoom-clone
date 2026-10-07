import type { ReactNode } from "react";

interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  badge?: number;
  danger?: boolean;
  disabled?: boolean;
}

export function ToolbarButton({
  label,
  onClick,
  children,
  badge,
  danger = false,
  disabled = false,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`relative flex min-h-11 min-w-14 flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue disabled:cursor-not-allowed disabled:opacity-40 ${danger ? "text-white" : "text-white/85"}`}
    >
      {children}
      <span className="hidden md:inline">{label}</span>
      {badge !== undefined && (
        <span className="absolute right-1 top-1 rounded-full bg-zoom-blue px-1.5 text-[10px] text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
