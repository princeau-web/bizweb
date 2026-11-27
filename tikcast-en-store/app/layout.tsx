import type { Metadata } from "next";
import "./globals.css";
import Tracker from "./components/Tracker";

export const metadata: Metadata = {
  title: "TikCast_en — Faceless Shorts Ebook",
  description:
    "Learn how to make viral faceless Shorts with AI — the TikCast_en ebook. One idea in, a finished vertical video out. $20 one-time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site">
          <div className="wrap">
            <div className="logo">
              TikCast<span className="sky">_</span>
              <span className="sun">en</span>
            </div>
            <a className="btn small" href="#buy">
              Get it for $20
            </a>
          </div>
        </header>
        <main>{children}</main>
        <Tracker />
        <footer className="site">
          <div className="wrap">
            By the creator of TikCast_en — “In this town…” faceless Shorts.
            <br />
            Results are not guaranteed: views and income depend on your content and consistency.
          </div>
        </footer>
      </body>
    </html>
  );
}
