import "./globals.css";

export const metadata = {
  title: "Ricoiz — Local Business Review & Reputation Aggregator",
  description:
    "Unify Google, Yelp, and Facebook reviews in one workspace with consent-aware automated review-request SMS sequences and reputation insights.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
