import type { Metadata } from "next";
import { Lato } from "next/font/google";

import { ToastProvider } from "@/components/ui";
import { UserProvider } from "@/components/layout/UserProvider";
import { SettingsProvider } from "@/components/settings/SettingsProvider";
import { APP_NAME } from "@/lib/constants";

import "./globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} Clone`,
  description: "A Zoom Workplace web app clone.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${lato.variable} antialiased`}>
        <ToastProvider>
          <UserProvider>
            <SettingsProvider>{children}</SettingsProvider>
          </UserProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
