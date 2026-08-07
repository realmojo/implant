import Link from "next/link"
import { CalendarDays, ChevronRight, Moon, Sun } from "lucide-react"

import type { SidoGroup } from "@/lib/supabase"

type CountKey = "cnt" | "night_cnt" | "sunday_cnt" | "holiday_cnt"

function sidoAnchor(index: number) {
  return `sido-${index}`
}

/**
 * 시도 바로가기 칩. 헤더(h-16) 아래에 붙는다.
 * 앵커 이동이 아니라 시도별 페이지로 실제 이동한다.
 */
export function SidoJumpNav({
  groups,
  basePath = "/regions",
  activeSido,
}: {
  groups: SidoGroup[]
  /** 링크 기준 경로 — "/regions" | "/night" | "/sunday" | "/holiday" */
  basePath?: string
  activeSido?: string
}) {
  return (
    <nav
      aria-label="시도 바로가기"
      className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <ul className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
        <li>
          <Link
            href={basePath}
            aria-current={activeSido ? undefined : "page"}
            className={
              activeSido
                ? "block rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                : "block rounded-full border border-primary bg-primary px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-primary-foreground"
            }
          >
            전국
          </Link>
        </li>
        {groups.map((group) => {
          const active = group.sido === activeSido
          return (
            <li key={group.sido}>
              <Link
                href={`${basePath}/${encodeURIComponent(group.sido)}`}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "block rounded-full border border-primary bg-primary px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-primary-foreground"
                    : "block rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                }
              >
                {group.sido}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * 시도별 시군구 카드 그리드.
 *
 * countKey로 카드에 띄울 숫자를 고르고(전체/야간/일요일/공휴일),
 * filterParam이 있으면 지역 상세로 넘어갈 때 해당 필터가 미리 적용된다.
 */
export function RegionGrid({
  groups,
  countKey = "cnt",
  filterParam,
  unit = "곳",
  basePath,
}: {
  groups: SidoGroup[]
  countKey?: CountKey
  filterParam?: "night" | "sunday" | "holiday"
  unit?: string
  /** 주면 시도 제목이 해당 시도 페이지 링크가 된다 (전국 목록에서만 필요) */
  basePath?: string
}) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-10 sm:px-6">
      {groups.map((group, i) => (
        <section key={group.sido} id={sidoAnchor(i)} className="scroll-mt-32">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-4 border-primary pl-3">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              {basePath ? (
                <Link
                  href={`${basePath}/${encodeURIComponent(group.sido)}`}
                  className="transition-colors hover:text-primary"
                >
                  {group.sido}
                </Link>
              ) : (
                group.sido
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {group.items.length}개 시군구
              <span className="mx-1.5 text-border">|</span>
              <span className="font-semibold text-foreground tabular-nums">
                {group.total.toLocaleString("ko-KR")}
                {unit}
              </span>
            </p>
          </div>

          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => {
              const href = `/regions/${encodeURIComponent(item.sido)}/${encodeURIComponent(item.sigungu)}${filterParam ? `?f=${filterParam}` : ""}`

              return (
                <li key={`${item.sido}-${item.sigungu}`}>
                  <Link
                    href={href}
                    className="group flex h-full flex-col justify-between gap-4 rounded-2xl border border-border bg-background p-5 transition-all outline-none hover:border-primary hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-base font-semibold text-foreground group-hover:text-primary">
                        {item.sigungu}
                      </span>
                      <span className="flex shrink-0 items-center gap-0.5 text-sm font-bold text-primary tabular-nums">
                        {item[countKey].toLocaleString("ko-KR")}
                        {unit}
                        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {[
                        { icon: Moon, label: "야간", n: item.night_cnt },
                        { icon: Sun, label: "일요일", n: item.sunday_cnt },
                        {
                          icon: CalendarDays,
                          label: "공휴일",
                          n: item.holiday_cnt,
                        },
                      ]
                        .filter((b) => b.n > 0)
                        .map((b) => (
                          <span
                            key={b.label}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground"
                          >
                            <b.icon className="size-3" />
                            {b.label} {b.n}
                          </span>
                        ))}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
