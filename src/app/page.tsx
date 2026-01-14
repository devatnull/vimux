"use client";

import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { ProgressDashboard } from "@/components/ProgressDashboard";
import {
  Terminal,
  Keyboard,
  Zap,
  BookOpen,
  ArrowRight,
  Github,
  CheckCircle,
} from "lucide-react";

const features = [
  {
    icon: Terminal,
    title: "Interactive Simulator",
    description:
      "Practice tmux and Neovim commands in a safe, browser-based environment",
    color: "text-[#7aa2f7]",
  },
  {
    icon: BookOpen,
    title: "Structured Lessons",
    description:
      "Learn progressively from basics to advanced workflows with guided tutorials",
    color: "text-[#9ece6a]",
  },
  {
    icon: Keyboard,
    title: "Complete Reference",
    description:
      "Quick access to all shortcuts with searchable cheat sheets",
    color: "text-[#bb9af7]",
  },
  {
    icon: Zap,
    title: "Real Keybindings",
    description:
      "Uses actual tmux and Neovim keybindings you'll use in production",
    color: "text-[#ff9e64]",
  },
];

const quickStartItems = [
  { key: "Ctrl-a -", desc: "Split tmux horizontally" },
  { key: "Ctrl-a h/j/k/l", desc: "Navigate tmux panes" },
  { key: "Space Space", desc: "Find files in Neovim" },
  { key: "gd / gr", desc: "Go to definition / references" },
  { key: "K", desc: "Show documentation" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#1a1b26]">
      <Navigation />

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#7aa2f7]/10 via-transparent to-transparent" />
          <div className="max-w-7xl mx-auto px-4 py-20 relative">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#24283b] text-sm text-[#a9b1d6] mb-6">
                <span className="w-2 h-2 rounded-full bg-[#9ece6a] animate-pulse" />
                Free & Open Source • No signup required
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-[#c0caf5]">Master </span>
                <span className="text-[#9ece6a]">tmux</span>
                <span className="text-[#c0caf5]"> & </span>
                <span className="text-[#7aa2f7]">Neovim</span>
              </h1>

              <p className="text-lg sm:text-xl text-[#a9b1d6] mb-8 max-w-2xl mx-auto">
                Learn the essential terminal tools that 10x developers use daily.
                Interactive tutorials, real keybindings, zero setup required.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/learn"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#7aa2f7] to-[#9ece6a] text-[#1a1b26] font-semibold hover:opacity-90 transition-opacity"
                >
                  Start Learning
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/practice"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#414868] text-[#a9b1d6] hover:bg-[#24283b] transition-colors"
                >
                  <Terminal className="w-4 h-4" />
                  Try the Simulator
                </Link>
              </div>
            </div>

            {/* Terminal Preview */}
            <div className="mt-16 max-w-4xl mx-auto">
              <div className="terminal">
                <div className="terminal-header">
                  <div className="terminal-btn close" />
                  <div className="terminal-btn minimize" />
                  <div className="terminal-btn maximize" />
                  <span className="ml-4 text-sm text-[#565f89]">
                    tmux: dev — nvim main.ts
                  </span>
                </div>
                <div className="bg-[#1a1b26] p-4 font-mono text-sm">
                  <div className="flex">
                    <span className="line-number">1</span>
                    <span>
                      <span className="syntax-comment">
                        // Welcome to the interactive simulator
                      </span>
                    </span>
                  </div>
                  <div className="flex">
                    <span className="line-number">2</span>
                    <span>
                      <span className="syntax-keyword">function</span>{" "}
                      <span className="syntax-function">greet</span>
                      {"(name: "}
                      <span className="syntax-type">string</span>
                      {") {"}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="line-number current">3</span>
                    <span>
                      {"  "}
                      <span className="syntax-keyword">return</span>{" "}
                      <span className="syntax-string">`Hello, ${"{"}name{"}"}`</span>
                      <span className="cursor-block">;</span>
                    </span>
                  </div>
                  <div className="flex">
                    <span className="line-number">4</span>
                    <span>{"}"}</span>
                  </div>
                  <div className="flex">
                    <span className="line-number">5</span>
                    <span />
                  </div>
                </div>
                <div className="flex items-center bg-[#24283b] text-sm">
                  <div className="px-2 py-1 font-bold bg-[#7aa2f7] text-[#1a1b26]">
                    NORMAL
                  </div>
                  <div className="px-3 py-1 text-[#a9b1d6]">main.ts</div>
                  <div className="flex-1" />
                  <div className="px-3 py-1 text-[#565f89]">3:24</div>
                </div>
                <div className="tmux-status">
                  <div className="tmux-status-left">
                    <span className="text-[#9ece6a]">❐ dev</span>
                    <span className="tmux-window active">0:code</span>
                    <span className="tmux-window">1:term</span>
                  </div>
                  <div className="tmux-status-right">
                    <span>10:30</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 border-t border-[#414868]">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-[#c0caf5] mb-12">
              Everything you need to become a terminal power user
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-[#24283b] rounded-lg p-6 hover:bg-[#2a2f45] transition-colors"
                >
                  <feature.icon className={`w-8 h-8 ${feature.color} mb-4`} />
                  <h3 className="font-semibold text-[#c0caf5] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[#a9b1d6]">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="py-20 border-t border-[#414868]">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#c0caf5] mb-4">
                  Learn the essentials first
                </h2>
                <p className="text-[#a9b1d6] mb-6">
                  You don't need to memorize hundreds of shortcuts. Master these
                  5 commands and you're already more productive than most
                  developers.
                </p>
                <Link
                  href="/learn"
                  className="inline-flex items-center gap-2 text-[#7aa2f7] hover:text-[#89b4fa] transition-colors"
                >
                  View all lessons
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="bg-[#24283b] rounded-lg p-6">
                <h3 className="text-sm font-medium text-[#565f89] mb-4 uppercase tracking-wider">
                  Essential Shortcuts
                </h3>
                <div className="space-y-3">
                  {quickStartItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-[#1a1b26] rounded-lg"
                    >
                      <span className="text-[#a9b1d6]">{item.desc}</span>
                      <code className="px-2 py-1 bg-[#414868] rounded text-sm text-[#c0caf5]">
                        {item.key}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Dashboard (only shows if user has progress) */}
        <section className="py-20 border-t border-[#414868]">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#c0caf5] mb-8">
              Your Progress
            </h2>
            <ProgressDashboard />
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 border-t border-[#414868]">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#c0caf5] mb-4">
              Ready to level up your terminal skills?
            </h2>
            <p className="text-[#a9b1d6] mb-8">
              No signup, no payment, no BS. Just start learning.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#7aa2f7] text-[#1a1b26] font-semibold hover:bg-[#89b4fa] transition-colors"
              >
                Start First Lesson
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://github.com/devatnull/vimux"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#414868] text-[#a9b1d6] hover:bg-[#24283b] transition-colors"
              >
                <Github className="w-4 h-4" />
                Star on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#414868] py-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-[#565f89]">
            <p>
              Built with ❤️ for developers who want to work faster.
              <br />
              <a
                href="https://github.com/devatnull/vimux"
                className="text-[#7aa2f7] hover:underline"
              >
                Open source
              </a>{" "}
              and free forever.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
