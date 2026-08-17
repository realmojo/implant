import type { Metadata } from "next"
import { Geist_Mono, IBM_Plex_Sans_KR, Noto_Serif_KR } from "next/font/google"

import "./globals.css"
import { GoogleAnalytics } from "@/components/google-analytics"
import { JsonLd } from "@/components/json-ld"
import { NaverAnalytics } from "@/components/naver-analytics"
import { SiteHeader } from "@/components/site-header"
import { siteJsonLd } from "@/lib/jsonld"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site"
import { cn } from "@/lib/utils"

/**
 * 한글 글리프는 용량이 커 preload 대신 표시 후 교체(swap)로 받는다.
 * 본문은 IBM Plex Sans KR(정보 밀도가 높은 목록에 적합한 또렷한 한글),
 * 제목은 Noto Serif KR(인쇄물 같은 무게감)로 역할을 나눈다.
 */
const fontSans = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
})

const fontDisplay = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-display",
  display: "swap",
  preload: false,
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  // OG 이미지·canonical 의 상대경로를 절대 URL 로 풀어주는 기준
  metadataBase: new URL(SITE_URL),
  // 하위 페이지는 제목 본문만 지정하면 사이트명이 자동으로 붙는다.
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  verification: {
    // 네이버 서치어드바이저 소유확인
    other: {
      "naver-site-verification": "fbbcfcb786dd5c309473f6adef37bb69862b067c",
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className={cn(
        "antialiased",
        fontSans.variable,
        fontDisplay.variable,
        fontMono.variable,
        "font-sans"
      )}
    >
      <head>
        {/* 사이트 전역 구조화 데이터 — 모든 페이지의 <head> 에 실린다 */}
        <JsonLd data={siteJsonLd()} />

        {/* Google Analytics (keywordegg 계열 공통 측정 ID) */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-5BM9W5BC3P"
        />
        <script
          id="google-analytics"
          dangerouslySetInnerHTML={{
            __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag() {
              dataLayer.push(arguments);
            }
            gtag('js', new Date());

            gtag('config', 'G-5BM9W5BC3P');
          `,
          }}
        />

        {/* 네이버 애널리틱스 (서치어드바이저 유입 확인용) */}
        <script type="text/javascript" src="//wcs.pstatic.net/wcslog.js" />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html:
              'if(!wcs_add) var wcs_add = {}; wcs_add["wa"] = "159f7184d59b700"; if(window.wcs) {wcs_do();}',
          }}
        />

        {/* Google AdSense (keywordegg 와 동일 계정) */}
        <script
          async
          crossOrigin="anonymous"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9130836798889522"
        />
      </head>
      <body>
        <SiteHeader />
        {children}

        <GoogleAnalytics />
        <NaverAnalytics />
      </body>
    </html>
  )
}
