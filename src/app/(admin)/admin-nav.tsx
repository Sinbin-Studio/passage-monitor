"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// 위쪽 큰 탭 3개, 저작권 아래에 작은 탭 3개.
const SECTIONS = [
  {
    label: "저작권",
    href: "/playback",
    tabs: [
      { href: "/playback", label: "재생 현황" },
      { href: "/records", label: "재생 기록" },
      { href: "/settlement", label: "정산 · 파일" },
    ],
  },
  { label: "미션", href: "/missions", tabs: [] },
  { label: "공지", href: "/notices", tabs: [] },
] as const;

function sectionOf(pathname: string | null) {
  return SECTIONS.find((s) => s.href === pathname || s.tabs.some((t) => t.href === pathname)) ?? null;
}

/** 큰 탭. 보고 있는 달(?month)을 저작권 화면 사이로 넘겨준다. */
export function AdminNav() {
  const pathname = usePathname();
  return <SectionLinks pathname={pathname} />;
}

export function AdminNavFallback() {
  return <SectionLinks pathname={null} />;
}

function SectionLinks({ pathname }: { pathname: string | null }) {
  const current = sectionOf(pathname);
  return (
    <nav aria-label="메뉴" className="flex flex-wrap gap-1">
      {SECTIONS.map((s) => {
        const on = current?.label === s.label;
        return (
          <Link
            key={s.label}
            href={s.href}
            aria-current={on ? "page" : undefined}
            className={`rounded-lg px-4 py-3 text-base ${
              on ? "bg-brand-soft font-extrabold text-brand-deep" : "font-semibold text-muted hover:text-brand-deep"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** 작은 탭 (저작권 안). 달 정보를 넘겨준다. */
export function SubNav() {
  const pathname = usePathname();
  const month = useSearchParams().get("month");
  return <SubLinks pathname={pathname} query={month ? `?month=${month}` : ""} />;
}

export function SubNavFallback() {
  const pathname = usePathname();
  return <SubLinks pathname={pathname} query="" />;
}

function SubLinks({ pathname, query }: { pathname: string | null; query: string }) {
  const section = sectionOf(pathname);
  if (!section || section.tabs.length === 0) return null;
  return (
    <div className="border-b border-line bg-surface">
      <nav aria-label={`${section.label} 메뉴`} className="mx-auto flex max-w-[1320px] gap-5 overflow-x-auto px-8 max-sm:px-4">
        {section.tabs.map((t) => {
          const on = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={`${t.href}${query}`}
              aria-current={on ? "page" : undefined}
              className={`-mb-px border-b-2 py-3 text-[15px] whitespace-nowrap ${
                on ? "border-brand font-extrabold text-brand-deep" : "border-transparent font-semibold text-muted hover:text-brand-deep"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
