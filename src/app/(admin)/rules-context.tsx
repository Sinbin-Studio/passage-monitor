"use client";

import { createContext, use, useState, type ReactNode } from "react";

import { DEFAULT_RULES, type PlaybackRules } from "@/lib/playback";

// 재생 현황에서 고른 제외 기준을 정산 · 파일 화면에서도 그대로 쓴다.
// 레이아웃에 있어 화면을 옮겨도 유지되고, 새로고침하면 기본값으로 돌아간다 (저장 기능은 아직 없음).
const RulesContext = createContext<{ rules: PlaybackRules; setRules: (r: PlaybackRules) => void } | null>(null);

export function RulesProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<PlaybackRules>(DEFAULT_RULES);
  return <RulesContext value={{ rules, setRules }}>{children}</RulesContext>;
}

export function useRules() {
  const ctx = use(RulesContext);
  if (!ctx) throw new Error("useRules 는 RulesProvider 안에서만 쓴다");
  return ctx;
}
