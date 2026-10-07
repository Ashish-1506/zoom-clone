import { AppShell } from "@/components/layout";

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell>{children}</AppShell>
  );
}
