import { cn, getInitials } from "@/lib/utils";

export interface AvatarProps {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ name, color = "#0B5CFF", size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        {
          "size-8 text-xs": size === "sm",
          "size-10 text-sm": size === "md",
          "size-14 text-lg": size === "lg",
        },
        className,
      )}
      style={{ backgroundColor: color }}
      aria-label={name}
    >
      {getInitials(name)}
    </span>
  );
}
