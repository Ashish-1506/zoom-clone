import { LoaderCircle } from "lucide-react";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function Spinner({ size = "md", label = "Loading" }: SpinnerProps) {
  const sizeClass = { sm: "size-4", md: "size-6", lg: "size-10" }[size];
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <LoaderCircle className={`${sizeClass} animate-spin text-zoom-blue`} aria-hidden="true" />
    </span>
  );
}
