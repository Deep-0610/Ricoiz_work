import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Review Engine — Google Reviews on Autopilot for Roofers",
  description:
    "$297/mo done-for-you Google Reviews service. 3-message SMS drip. AI review responses. 10 reviews in 30 days or your next month is free.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
