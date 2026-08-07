"use client"

import Script from "next/script"

declare global {
  interface Window {
    wcs_add?: Record<string, string>
    wcs?: unknown
    wcs_do?: () => void
  }
}

const ACCOUNT = "2558cba2399af40"

/**
 * 네이버 애널리틱스(wcslog).
 *
 * React 컴포넌트가 그린 <script> 는 클라이언트 렌더 시 실행되지 않으므로
 * next/script 로 싣고, 로드가 끝난 뒤(onLoad)에 계정 설정과 집계를 호출한다.
 */
export function NaverAnalytics() {
  return (
    <Script
      src="https://wcs.naver.net/wcslog.js"
      strategy="afterInteractive"
      onLoad={() => {
        window.wcs_add = window.wcs_add ?? {}
        window.wcs_add.wa = ACCOUNT
        if (window.wcs) window.wcs_do?.()
      }}
    />
  )
}
