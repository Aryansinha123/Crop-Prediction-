import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "../components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgriClimate AI - Climate-Aware Crop Yield Predictions",
  description: "A research-grade climate anomaly intelligence and crop yield prediction platform for Uttar Pradesh.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full flex bg-[#060913] text-slate-100 overflow-hidden noise-overlay">
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
          {/* Ambient floating orbs */}
          <div className="absolute top-[-100px] right-[-50px] w-[600px] h-[600px] bg-emerald-950/15 blur-[140px] rounded-full pointer-events-none -z-10 animate-float-orb" />
          <div className="absolute bottom-[-80px] left-[-100px] w-[500px] h-[500px] bg-blue-950/12 blur-[120px] rounded-full pointer-events-none -z-10 animate-float-orb-delayed" />
          <div className="absolute top-[40%] right-[20%] w-[350px] h-[350px] bg-purple-950/8 blur-[100px] rounded-full pointer-events-none -z-10 animate-float-orb-slow" />
          
          {/* Dot grid pattern overlay */}
          <div className="absolute inset-0 dot-grid pointer-events-none -z-10" />
          
          <div className="pt-24 pb-8 px-4 sm:px-6 lg:py-10 lg:px-12 max-w-[1440px] w-full mx-auto flex-1">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
