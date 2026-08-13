import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  CalendarDays,
  ChevronRight,
  ExternalLink,
  Info,
  MapPin,
  Moon,
  Phone,
  Sun,
} from "lucide-react"

import { AdSense } from "@/components/adsense"
import { AD_SLOTS } from "@/lib/adsense"
import { JsonLd } from "@/components/json-ld"
import { breadcrumbJsonLd, clinicCrumbs, dentistJsonLd } from "@/lib/jsonld"
import {
  getClinicBySlug,
  getNearbyClinics,
  getPlaceStats,
  getRegionStats,
  type ClinicWithSlug,
} from "@/lib/supabase"
import { buildClinicSummary } from "@/lib/summary"
import { buildReviewDigest } from "@/lib/review-stats"
import { pickGuidesFor } from "@/lib/guides"
import { baseDong } from "@/lib/region"

export const revalidate = 3600

type Params = { slug: string }

const DAYS = [
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
  "일요일",
  "공휴일",
] as const

function decodeSlug(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** "0930 ~ 1800" → "09:30 ~ 18:00" (형식이 다르면 원문 그대로) */
function formatHours(value: string | undefined) {
  if (!value) return null
  const m = value.match(/^\s*(\d{3,4})\s*~\s*(\d{3,4})\s*$/)
  if (!m) return value
  const toTime = (t: string) => {
    const p = t.padStart(4, "0")
    return `${p.slice(0, 2)}:${p.slice(2)}`
  }
  return `${toTime(m[1])} ~ ${toTime(m[2])}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const clinic = await getClinicBySlug(decodeSlug(slug))

  if (!clinic) return { title: "찾을 수 없는 치과" }

  return {
    // 제목은 슬러그와 동일한 규칙(시군구 + 치과명)
    title: `${clinic.sigungu} ${clinic.name}`,
    description: `${clinic.address}. ${clinic.name}의 진료시간·전화번호·야간/일요일/공휴일 진료 여부를 확인하세요.`,
  }
}

function Badge({
  icon: Icon,
  children,
}: {
  icon: typeof Moon
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
      <Icon className="size-3.5" />
      {children}
    </span>
  )
}

function HoursTable({ clinic }: { clinic: ClinicWithSlug }) {
  const rows = DAYS.map((day) => ({
    day,
    value: formatHours(clinic.hours?.[day]),
  })).filter((row) => row.value)

  if (rows.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
        <Info className="size-4 shrink-0" />
        진료시간 정보가 제공되지 않습니다.
      </p>
    )
  }

  return (
    <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {rows.map((row) => {
        const closed = row.value === "휴무"
        return (
          <div
            key={row.day}
            className="flex items-center justify-between gap-3 bg-background px-4 py-3 text-sm"
          >
            <dt className="text-muted-foreground">{row.day}</dt>
            <dd
              className={
                closed
                  ? "text-muted-foreground"
                  : "font-semibold text-foreground tabular-nums"
              }
            >
              {row.value}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export default async function ClinicPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const clinic = await getClinicBySlug(decodeSlug(slug))

  if (!clinic) notFound()

  const [nearby, region, placeStats] = await Promise.all([
    getNearbyClinics(clinic),
    getRegionStats(clinic),
    getPlaceStats(clinic.id),
  ])
  const summary = buildClinicSummary(clinic, region, baseDong(clinic.dong))
  const guides = pickGuidesFor(clinic)
  const digest = buildReviewDigest(placeStats)

  const hasBadges =
    clinic.open_night ||
    clinic.open_sunday ||
    clinic.open_holiday ||
    clinic.open_saturday
  const regionHref = `/regions/${encodeURIComponent(clinic.sido)}/${encodeURIComponent(clinic.sigungu)}`

  return (
    <>
      <JsonLd data={dentistJsonLd(clinic)} />
      <JsonLd data={breadcrumbJsonLd(clinicCrumbs(clinic))} />

      <main className="min-h-svh bg-muted/30">
        <div className="border-b border-border bg-background">
          <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
            {/* 최상단 — 제목보다 위 */}
            <AdSense slot={AD_SLOTS.top} className="mb-6" />

            <nav aria-label="위치" className="text-xs text-muted-foreground">
              <ol className="flex flex-wrap items-center gap-1">
                <li>
                  <Link href="/" className="hover:text-primary">
                    홈
                  </Link>
                </li>
                <ChevronRight className="size-3" aria-hidden />
                <li>
                  <Link href="/regions" className="hover:text-primary">
                    지역별 임플란트치과
                  </Link>
                </li>
                <ChevronRight className="size-3" aria-hidden />
                <li>
                  <Link href={regionHref} className="hover:text-primary">
                    {clinic.sido} {clinic.sigungu}
                  </Link>
                </li>
                <ChevronRight className="size-3" aria-hidden />
                <li aria-current="page" className="font-medium text-foreground">
                  {clinic.name}
                </li>
              </ol>
            </nav>

            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {clinic.name}
              </h1>
              {clinic.category ? (
                <span className="mt-1 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                  {clinic.category}
                </span>
              ) : null}
            </div>

            <p className="mt-3 flex items-start gap-2 text-base leading-relaxed text-muted-foreground">
              <MapPin className="mt-1 size-4.5 shrink-0" />
              <span>{clinic.address}</span>
            </p>

            {hasBadges ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {clinic.open_night && <Badge icon={Moon}>야간 진료</Badge>}
                {clinic.open_saturday && (
                  <Badge icon={CalendarDays}>토요일 진료</Badge>
                )}
                {clinic.open_sunday && <Badge icon={Sun}>일요일 진료</Badge>}
                {clinic.open_holiday && (
                  <Badge icon={CalendarDays}>공휴일 진료</Badge>
                )}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {clinic.phone ? (
                <a
                  href={`tel:${clinic.phone.replace(/[^0-9+]/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
                >
                  <Phone className="size-4.5" />
                  {clinic.phone}
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-5 py-2.5 text-sm text-muted-foreground">
                  <Info className="size-4" />
                  전화번호 정보가 제공되지 않습니다
                </span>
              )}
              {clinic.naver_map_url ? (
                <a
                  href={clinic.naver_map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <ExternalLink className="size-4.5" />
                  지도 보기
                </a>
              ) : null}
            </div>

            {/* 중간 — 전화번호 아래 */}
            <AdSense slot={AD_SLOTS.middle} className="mt-6" />
          </div>
        </div>

        <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6">
          {/* 데이터에서 뽑아낸 요약 — 치과마다 문장이 달라진다 */}
          <section>
            <h2 className="mb-3 text-lg font-bold tracking-tight">
              {clinic.name} 진료 요약
            </h2>

            {summary.highlights.length > 0 ? (
              <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {summary.highlights.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <dt className="text-xs text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd className="mt-1 font-semibold text-foreground tabular-nums">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="space-y-3 rounded-xl border border-border bg-background px-5 py-5">
              {summary.paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 24)}
                  className="text-[15px] leading-[1.85] text-foreground/85"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold tracking-tight">진료시간</h2>
            <HoursTable clinic={clinic} />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold tracking-tight">위치</h2>
            <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {[
                { label: "시도", value: clinic.sido },
                { label: "시군구", value: clinic.sigungu },
                { label: "읍면동", value: clinic.dong },
                { label: "주소", value: clinic.address },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-start justify-between gap-4 bg-background px-4 py-3 text-sm"
                >
                  <dt className="shrink-0 text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="text-right font-medium text-foreground">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* 리뷰 원문이 아니라 집계에서 만들어낸 문장 */}
          {digest ? (
            <section>
              <h2 className="mb-1 text-lg font-bold tracking-tight">
                방문자 리뷰로 본 {clinic.name}
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                네이버 플레이스 리뷰에 남은 기록을 집계했습니다. 리뷰 내용
                자체가 아니라 대기 시간·방문 방식 같은 항목의 분포입니다.
              </p>

              <div className="space-y-5 rounded-xl border border-border bg-background px-5 py-5">
                {digest.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 24)}
                    className="text-[15px] leading-[1.85] text-foreground/85"
                  >
                    {paragraph}
                  </p>
                ))}

                {digest.waitBars.length > 0 ? (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-foreground">
                      대기 시간 분포
                    </h3>
                    <ul className="space-y-2">
                      {digest.waitBars.map((bar) => (
                        <li
                          key={bar.label}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span className="w-20 shrink-0 text-muted-foreground">
                            {bar.label}
                          </span>
                          <span
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${Math.max(bar.pct, 4)}%` }}
                            aria-hidden
                          />
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {bar.count}건 ({bar.pct}%)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {digest.conveniences.length > 0 ? (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-foreground">
                      등록된 편의시설
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {digest.conveniences.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {clinic.tags.length > 0 ? (
            <section>
              <h2 className="mb-3 text-lg font-bold tracking-tight">태그</h2>
              <div className="flex flex-wrap gap-2">
                {clinic.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {/* 하단 — 태그 아래 */}
          <AdSense slot={AD_SLOTS.bottom} />

          {nearby.length > 0 ? (
            <section>
              <h2 className="mb-1 text-lg font-bold tracking-tight">
                {clinic.sigungu}의 다른 임플란트 치과
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                같은 지역에서 함께 비교해 보세요.
              </p>

              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {nearby.map((c) => {
                  const weekday = formatHours(c.hours?.["월요일"])

                  return (
                    <li key={c.id}>
                      <Link
                        href={`/${c.slug}`}
                        className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-background p-4 transition-all outline-none hover:border-primary hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-foreground group-hover:text-primary">
                            {c.name}
                          </span>
                          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>

                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" />
                          {c.dong}
                        </span>

                        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                          {c.open_night ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                              <Moon className="size-3" />
                              야간
                            </span>
                          ) : null}
                          {c.open_sunday ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                              <Sun className="size-3" />
                              일요일
                            </span>
                          ) : null}
                          {c.open_holiday ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                              <CalendarDays className="size-3" />
                              공휴일
                            </span>
                          ) : null}
                          {weekday ? (
                            <span className="text-muted-foreground tabular-nums">
                              평일 {weekday}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              진료시간 정보 없음
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {/* 이 치과의 조건에 맞는 글만 고른다. 전 페이지에 같은 3개를 붙이지 않는다. */}
          <section>
            <h2 className="mb-1 text-lg font-bold tracking-tight">
              가기 전에 알아두면 좋은 것
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              임플란트 비용과 진행 과정을 미리 확인해 보세요.
            </p>

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {guides.map((guide) => (
                <li key={guide.slug}>
                  <Link
                    href={`/guide/${guide.slug}`}
                    className="group flex h-full flex-col gap-1.5 rounded-xl border border-border bg-background p-4 transition-all outline-none hover:border-primary hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="flex items-start justify-between gap-2 font-semibold text-foreground group-hover:text-primary">
                      {guide.short}
                      <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </span>
                    <span className="text-sm leading-relaxed text-muted-foreground">
                      {guide.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <Link
            href={regionHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
          >
            {clinic.sigungu} 임플란트 치과 전체 보기
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </main>
    </>
  )
}
