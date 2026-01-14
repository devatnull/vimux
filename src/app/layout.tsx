import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learn tmux & Neovim - Interactive Tutorial",
  description:
    "Master tmux and Neovim with interactive lessons. Free, no signup required. Learn keyboard shortcuts, workflows, and become a terminal power user.",
  keywords: [
    "tmux",
    "neovim",
    "vim",
    "terminal",
    "tutorial",
    "learn",
    "keyboard shortcuts",
    "developer tools",
  ],
  authors: [{ name: "Learn tmux & Neovim" }],
  openGraph: {
    title: "Learn tmux & Neovim - Interactive Tutorial",
    description: "Master tmux and Neovim with interactive lessons",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
