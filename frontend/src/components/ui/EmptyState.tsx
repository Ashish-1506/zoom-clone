import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zoom-border bg-white px-6 py-12 text-center">
      <div className="mb-4 rounded-full bg-zoom-blue-light p-3 text-zoom-blue">{icon}</div>
      <h2 className="text-lg font-bold text-zoom-text">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-zoom-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
