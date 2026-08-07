"use client"

import { useEffect, useRef } from "react"

import { AD_CLIENT } from "@/lib/adsense"

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

/**
 * 애드센스 디스플레이 광고 한 칸.
 *
 * 스크립트는 layout 의 <head> 에서 한 번만 싣고, 여기서는 슬롯만 등록한다.
 * 개발 모드의 StrictMode 이중 실행으로 같은 칸에 두 번 push 되지 않도록 막는다.
 */
export function AdSense({
  slot,
  className,
}: {
  slot: string
  className?: string
}) {
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    pushed.current = true

    try {
      ;(window.adsbygoogle = window.adsbygoogle ?? []).push({})
    } catch {
      // 광고 차단기 등으로 스크립트가 없을 수 있다. 페이지 동작에는 영향 없음.
    }
  }, [])

  return (
    <ins
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block" }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
