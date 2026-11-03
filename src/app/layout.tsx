import type { Metadata } from "next";
import { Gothic_A1 } from "next/font/google";
import "./globals.css";

// 한글 서브셋이 없어 preload 없이 불러온다.
const gothicA1 = Gothic_A1({
  variable: "--font-gothic-a1",
  weight: ["400", "600", "800"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Passage Beta Dashboard",
  description: "Passage 베타테스터 미션 진행 현황 대시보드",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${gothicA1.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
