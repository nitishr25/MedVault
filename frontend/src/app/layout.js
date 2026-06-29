import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// GEIST CONFIGURATION LAYOUT (Optimized font subsets loading)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// BRANDING INFRASTRUCTURE METADATA MATRIX
export const metadata = {
  title: "MedVault | Decentralized Health Log Node Matrix",
  description: "Cryptographically secured medical document management pipeline integrated with decentralized IPFS storage networks.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased scroll-smooth select-none`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden selection:bg-teal-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}