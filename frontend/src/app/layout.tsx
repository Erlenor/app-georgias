import { Inter } from "next/font/google";
import "../styles/globals.css";
import { AuthProvider } from "../context/AuthContext";
import type { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Thales",
  description: "OAuth Starter Template",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
