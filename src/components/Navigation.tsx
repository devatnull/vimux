"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Terminal, BookOpen, Keyboard, Home, Github } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/practice", label: "Practice", icon: Terminal },
  { href: "/reference", label: "Reference", icon: Keyboard },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1b26]/95 backdrop-blur border-b border-[#414868]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#7aa2f7] to-[#9ece6a] group-hover:scale-105 transition-transform">
              <Terminal className="w-5 h-5 text-[#1a1b26]" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-[#c0caf5]">Learn</span>
              <span className="text-[#7aa2f7]"> tmux</span>
              <span className="text-[#565f89]"> & </span>
              <span className="text-[#9ece6a]">Neovim</span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#24283b] text-[#c0caf5]"
                      : "text-[#565f89] hover:text-[#a9b1d6] hover:bg-[#24283b]/50"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}

            {/* GitHub */}
            <a
              href="https://github.com/devatnull/learn-tmux-and-nvim"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-[#565f89] hover:text-[#a9b1d6] hover:bg-[#24283b]/50 transition-colors ml-2"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
