import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { WorkspaceProvider } from "@/modules/workspaces/components/workspace-provider/workspace-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Matching Control Center",
  description: "Compose matching templates, run jobs, and review matches.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}
