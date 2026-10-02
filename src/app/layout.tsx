import type { Metadata } from "next";
import { Archivo, Orbitron, Rajdhani, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Archivo (heavy, wide) = FLOWMTD brand type · Orbitron = HUD labels · Rajdhani = UI text · JetBrains Mono = numbers
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", axes: ["wdth"], style: ["normal", "italic"] });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", weight: ["500", "700"] });
const rajdhani = Rajdhani({ subsets: ["latin"], variable: "--font-rajdhani", weight: ["500", "600", "700"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "FLOWHUB · FLOWMTD Trading",
  description: "Prop firm pass plans, income roadmap and trading journal for the FLOWMTD Discord.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${orbitron.variable} ${rajdhani.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
