import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Ahadu Plus | AI-Powered Digital Banking Evaluation Platform",
  description: "Ahadu Plus — AI-Powered Digital Banking Product Evaluation Platform for Ahadu Bank",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
