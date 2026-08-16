import Link from "next/link"
import { ArrowRight, CalendarDays, Moon, Sun } from "lucide-react"

import { AdBanner } from "@/components/adsense"
import { NowStrip } from "@/components/now-strip"
import { RegionSearch } from "@/components/region-search"
import { AD_SLOTS } from "@/lib/adsense"
import { getDongCount, getSigunguCountsBySido } from "@/lib/supabase"

/** 집계는 자주 바뀌지 않으므로 1시간 단위로 재생성 */
export const revalidate = 3600

export default async function Page() {
  const [groups, dongCount] = await Promise.all([
    getSigunguCountsBySido(),
    getDongCount(),
  ])

  const total = groups.reduce((sum, g) => sum + g.total, 0)
  const sigunguCount = groups.reduce((sum, g) => sum + g.items.length, 0)

  const sum = (key: "night_cnt" | "sunday_cnt" | "holiday_cnt") =>
    groups.reduce(
      (acc, g) => acc + g.items.reduce((inner, i) => inner + i[key], 0),
      0
    )

  const nightCount = sum("night_cnt")
  const sundayCount = sum("sunday_cnt")
  const holidayCount = sum("holiday_cnt")

  const topSigungu = groups
    .flatMap((g) => g.items)
    .sort((a, b) => b.cnt - a.cnt)[0]

  const ko = (n: number) => n.toLocaleString("ko-KR")

  const conditions = [
    {
      icon: Moon,
      label: "야간 진료",
      note: "평일 저녁 8시 이후까지",
      value: nightCount,
      href: "/night",
    },
    {
      icon: Sun,
      label: "일요일 진료",
      note: "일요일에 문을 여는 곳",
      value: sundayCount,
      href: "/sunday",
    },
    {
      icon: CalendarDays,
      label: "공휴일 진료",
      note: "공휴일에 문을 여는 곳",
      value: holidayCount,
      href: "/holiday",
    },
  ]

  const regions = groups.flatMap((g) =>
    g.items.map((i) => ({ sido: i.sido, sigungu: i.sigungu, cnt: i.cnt }))
  )
  const popular = [...regions].sort((a, b) => b.cnt - a.cnt).slice(0, 12)

  return (
    <main className="dossier-paper dossier-grain min-h-svh">
      {/* ───────────── 표제 ───────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
        <p
          className="dossier-reveal font-mono text-xs tracking-[0.2em] text-primary uppercase"
          style={{ "--delay": "0ms" } as React.CSSProperties}
        >
          전국 임플란트치과 색인
        </p>

        <div className="mt-6 grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            {/* 홈의 h1 은 헤더 로고(사이트명)라 히어로 문구는 h2 로 둔다. */}
            <h2
              className="dossier-reveal font-display text-[clamp(2.4rem,7vw,4.75rem)] leading-[1.08] font-black tracking-[-0.03em] text-balance"
              style={{ "--delay": "80ms" } as React.CSSProperties}
            >
              우리 동네
              <br />
              <span className="text-primary">임플란트 치과</span>를
              <br />
              찾습니다
            </h2>

            <p
              className="dossier-reveal mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
              style={{ "--delay": "180ms" } as React.CSSProperties}
            >
              전국 치과를 시도·시군구·읍면동까지 정리했습니다. 진료시간과
              야간·일요일·공휴일 진료 여부, 전화번호를 한자리에서 확인하세요.
            </p>

            <div
              className="dossier-reveal mt-8 max-w-xl"
              style={{ "--delay": "240ms" } as React.CSSProperties}
            >
              <RegionSearch regions={regions} />
            </div>

            <div
              className="dossier-reveal mt-6 flex flex-wrap items-center gap-3"
              style={{ "--delay": "260ms" } as React.CSSProperties}
            >
              <Link
                href="/regions"
                className="group inline-flex items-center gap-2 bg-foreground px-7 py-4 text-base font-semibold text-background transition-colors outline-none hover:bg-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                지역별로 찾기
                <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-1" />
              </Link>

              {topSigungu ? (
                <p className="text-sm text-muted-foreground">
                  최다 등록{" "}
                  <span className="font-semibold text-foreground">
                    {topSigungu.sigungu}
                  </span>{" "}
                  <span className="font-mono tabular-nums">
                    {ko(topSigungu.cnt)}곳
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          {/* 지면 오른쪽을 채우는 큰 숫자 — 이 사이트의 규모 그 자체 */}
          <div
            className="dossier-reveal lg:text-right"
            style={{ "--delay": "340ms" } as React.CSSProperties}
          >
            <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
              등록 치과
            </p>
            <p className="font-display text-[clamp(4rem,15vw,9rem)] leading-[0.85] font-black tracking-[-0.05em] tabular-nums">
              {ko(total)}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm text-muted-foreground tabular-nums lg:justify-end">
              <span>시도 {groups.length}</span>
              <span>시군구 {ko(sigunguCount)}</span>
              <span>읍면동 {ko(dongCount)}</span>
            </div>
          </div>
        </div>

        <div
          className="dossier-wipe dossier-rule mt-14"
          style={{ "--delay": "420ms" } as React.CSSProperties}
        />

        <div
          className="dossier-reveal mt-8"
          style={{ "--delay": "500ms" } as React.CSSProperties}
        >
          <NowStrip nightCount={nightCount} sundayCount={sundayCount} />
        </div>
      </section>

      <AdBanner slot={AD_SLOTS.middle} className="pb-16 sm:pb-20" />

      {/* ───────────── 진료 조건 ───────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-xs text-primary tabular-nums">
            01
          </span>
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            조건으로 좁히기
          </h2>
        </div>

        <ul className="dossier-rule mt-6 grid grid-cols-1 sm:grid-cols-3">
          {conditions.map((c) => (
            <li
              key={c.label}
              className="dossier-hairline sm:border-t-0 sm:[&+&]:border-l sm:[&+&]:border-l-foreground/10"
            >
              <Link
                href={c.href}
                className="group flex h-full items-end justify-between gap-4 px-1 py-7 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:block sm:px-6 sm:first:pl-0"
              >
                <div>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors group-hover:text-primary">
                    <c.icon className="size-4 text-primary" />
                    {c.label}
                  </span>
                  <p className="mt-2 hidden text-sm text-muted-foreground sm:block">
                    {c.note}
                  </p>
                </div>
                <p className="font-display text-4xl leading-none font-black tracking-tight tabular-nums transition-colors group-hover:text-primary sm:mt-6 sm:text-5xl">
                  {ko(c.value)}
                  <span className="ml-1 font-sans text-base font-semibold text-muted-foreground">
                    곳
                  </span>
                </p>
                <span className="mt-4 hidden items-center gap-1.5 font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase transition-colors group-hover:text-primary sm:inline-flex">
                  목록 보기
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────────── 등록이 많은 시군구 ───────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-xs text-primary tabular-nums">
            02
          </span>
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            등록이 많은 시군구
          </h2>
        </div>

        <ul className="mt-6 flex flex-wrap gap-2">
          {popular.map((r) => (
            <li key={`${r.sido}-${r.sigungu}`}>
              <Link
                href={`/regions/${encodeURIComponent(r.sido)}/${encodeURIComponent(r.sigungu)}`}
                className="group inline-flex items-baseline gap-2 border border-foreground/15 bg-background px-4 py-2.5 transition-colors outline-none hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span className="text-sm font-semibold transition-colors group-hover:text-primary">
                  {r.sigungu}
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {ko(r.cnt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────────── 지역 색인 ───────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 sm:pb-32">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-xs text-primary tabular-nums">
              03
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              지역 색인
            </h2>
          </div>
          <Link
            href="/regions"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            시군구까지 전부 보기
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <ol className="dossier-rule mt-6 grid grid-cols-1 gap-x-12 md:grid-cols-2">
          {groups.map((group, i) => (
            <li key={group.sido} className="dossier-hairline">
              <Link
                href={`/regions/${encodeURIComponent(group.sido)}`}
                className="group flex items-baseline gap-3 py-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="shrink-0 text-base font-semibold transition-colors group-hover:text-primary">
                  {group.sido}
                </span>
                <span className="dossier-leader" aria-hidden />
                {/* 좁은 화면에서는 시군구 수를 접어 행이 가로로 넘치지 않게 한다 */}
                <span className="hidden shrink-0 font-mono text-sm text-muted-foreground tabular-nums sm:inline">
                  {group.items.length}개 시군구
                </span>
                <span className="shrink-0 text-right font-display text-lg font-bold tabular-nums sm:w-20">
                  {ko(group.total)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <AdBanner slot={AD_SLOTS.bottom} className="pb-16" />

      {/* ───────────── 데이터 기준 ───────────── */}
      <section className="dossier-rule mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">데이터 기준</span> ·
          전국 임플란트치과 {ko(total)}곳의 이름·주소·지역 구분을 수록했습니다.
          이 가운데 전화번호와 진료시간은 원본에서 확인 가능한 곳에 한해
          표시되며, 실제 진료 여부는 방문 전 전화로 확인하시기 바랍니다.
        </p>
      </section>
    </main>
  )
}
