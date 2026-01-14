"use client";

import { lessons, getLessonProgress } from "@/lib/lessons";
import { useUserStore } from "@/lib/store";
import { BarChart3, Trophy, Flame, Clock } from "lucide-react";

export function ProgressDashboard() {
  const { user } = useUserStore();

  const completedLessons = Object.entries(user.progress)
    .filter(([, p]) => p.completed)
    .map(([id]) => id);

  const { total, completed, percentage } = getLessonProgress(completedLessons);

  const tmuxCompleted = completedLessons.filter((id) =>
    lessons.find((l) => l.id === id)?.category === "tmux"
  ).length;
  const tmuxTotal = lessons.filter((l) => l.category === "tmux").length;

  const neovimCompleted = completedLessons.filter((id) =>
    lessons.find((l) => l.id === id)?.category === "neovim"
  ).length;
  const neovimTotal = lessons.filter((l) => l.category === "neovim").length;

  const workflowCompleted = completedLessons.filter((id) =>
    lessons.find((l) => l.id === id)?.category === "workflow"
  ).length;
  const workflowTotal = lessons.filter((l) => l.category === "workflow").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Overall Progress */}
      <div className="bg-[#24283b] rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#7aa2f7]/20">
            <BarChart3 className="w-5 h-5 text-[#7aa2f7]" />
          </div>
          <div>
            <h3 className="font-medium text-[#c0caf5]">Overall Progress</h3>
            <p className="text-sm text-[#565f89]">
              {completed} of {total} lessons
            </p>
          </div>
        </div>
        <div className="progress-bar h-2 mb-2">
          <div
            className="progress-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-right text-sm text-[#7aa2f7] font-medium">
          {percentage}%
        </p>
      </div>

      {/* tmux Progress */}
      <div className="bg-[#24283b] rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#9ece6a]/20">
            <Trophy className="w-5 h-5 text-[#9ece6a]" />
          </div>
          <div>
            <h3 className="font-medium text-[#c0caf5]">tmux</h3>
            <p className="text-sm text-[#565f89]">
              {tmuxCompleted} of {tmuxTotal} lessons
            </p>
          </div>
        </div>
        <div className="progress-bar h-2 mb-2">
          <div
            className="h-full bg-[#9ece6a] rounded-full transition-all"
            style={{
              width: `${tmuxTotal ? (tmuxCompleted / tmuxTotal) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Neovim Progress */}
      <div className="bg-[#24283b] rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#7aa2f7]/20">
            <Trophy className="w-5 h-5 text-[#7aa2f7]" />
          </div>
          <div>
            <h3 className="font-medium text-[#c0caf5]">Neovim</h3>
            <p className="text-sm text-[#565f89]">
              {neovimCompleted} of {neovimTotal} lessons
            </p>
          </div>
        </div>
        <div className="progress-bar h-2 mb-2">
          <div
            className="h-full bg-[#7aa2f7] rounded-full transition-all"
            style={{
              width: `${neovimTotal ? (neovimCompleted / neovimTotal) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Streak */}
      <div className="bg-[#24283b] rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#ff9e64]/20">
            <Flame className="w-5 h-5 text-[#ff9e64]" />
          </div>
          <div>
            <h3 className="font-medium text-[#c0caf5]">Current Streak</h3>
            <p className="text-sm text-[#565f89]">Days of practice</p>
          </div>
        </div>
        <p className="text-4xl font-bold text-[#ff9e64]">
          {user.stats.currentStreak}
          <span className="text-lg text-[#565f89] ml-1">days</span>
        </p>
      </div>
    </div>
  );
}
