"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { ArrowUpRight, Moon, Sun } from "lucide-react"

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const

type Props = {
  /** 야간 진료 치과 수 */
  nightCount: number
  /** 일요일 진료 치과 수 */
  sundayCount: number
}

type Snapshot = {
  stamp: string
  headline: string
  count: number
  icon: typeof Moon
}

/** 지금 시각을 기준으로 어떤 진료 조건이 유효한지 고른다. */
function readNow({ nightCount, sundayCount }: Props): Snapshot {
  const now = new Date()
  const day = now.getDay()
  const hour = now.getHours()

  const stamp = `${now.getMonth() + 1}월 ${now.getDate()}일 (${DAY_LABELS[day]}) ${String(
    hour
  ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

  if (day === 0) {
    return {
      stamp,
      headline: "오늘은 일요일입니다. 일요일에 문을 여는 곳",
      count: sundayCount,
      icon: Sun,
    }
  }

  if (hour >= 18 || hour < 9) {
    return {
      stamp,
      headline: "지금은 야간 시간대입니다. 저녁 8시 이후까지 여는 곳",
      count: nightCount,
      icon: Moon,
    }
  }

  return {
    stamp,
    headline: "저녁 늦게까지 진료하는 곳을 미리 찾아두세요",
    count: nightCount,
    icon: Moon,
  }
}

/** 30초마다 바뀌는 시각 슬롯. 서버 스냅샷은 null이라 SSR 결과가 흔들리지 않는다. */
function subscribeToClock(onChange: () => void) {
  const timer = setInterval(onChange, 30_000)
  return () => clearInterval(timer)
}

export function NowStrip(props: Props) {
  // 서버와 클라이언트의 시각이 다르므로 마운트 이후에만 그린다.
  const slot = useSyncExternalStore(
    subscribeToClock,
    () => Math.floor(Date.now() / 30_000),
    () => null
  )

  const snap = slot === null ? null : readNow(props)
  const Icon = snap?.icon ?? Moon

  return (
    <Link
      href="/regions"
      className="group flex flex-wrap items-center gap-x-4 gap-y-2 border border-foreground/15 bg-background px-5 py-4 transition-colors hover:border-primary sm:px-6"
    >
      <span className="inline-flex items-center gap-2 text-primary">
        <Icon className="size-4" />
        <span className="font-mono text-xs tracking-tight tabular-nums">
          {/* 서버 렌더 시점에는 자리만 잡아둔다 */}
          {snap ? snap.stamp : "──월 ──일 (─) ──:──"}
        </span>
      </span>

      <span className="h-4 w-px bg-foreground/15 max-sm:hidden" />

      {/* 좁은 화면에서는 한 줄을 통째로 써서 문장이 좁은 단으로 짓눌리지 않게 한다 */}
      <span className="w-full min-w-0 text-sm leading-relaxed text-muted-foreground sm:w-auto sm:flex-1">
        {snap?.headline ?? "지금 진료 중인 치과를 확인해 보세요"}
        <strong className="ml-1.5 font-display text-base font-bold text-foreground tabular-nums">
          {snap ? snap.count.toLocaleString("ko-KR") : "—"}
        </strong>
        <span className="text-foreground">곳</span>
      </span>

      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground group-hover:text-primary">
        찾아보기
        <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </Link>
  )
}
