import { cn } from "@/lib/utils";

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <span className={cn("block animate-pulse rounded-md bg-zoom-bg", className)} aria-hidden="true" />;
}
