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
  type ClinicWithSlug,
} from "@/lib/supabase"

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

  const nearby = await getNearbyClinics(clinic)

  const hasBadges =
    clinic.open_night ||
    clinic.open_sunday ||
    clinic.open_holiday ||
    clinic.open_saturday
  const regionHref = `/regions/${encodeURIComponent(clinic.sido)}/${encodeURIComponent(clinic.sigungu)}`

  return (
    <main className="min-h-svh bg-muted/30">
      <JsonLd data={dentistJsonLd(clinic)} />
      <JsonLd data={breadcrumbJsonLd(clinicCrumbs(clinic))} />

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
                <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                <dd className="text-right font-medium text-foreground">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

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

        <Link
          href={regionHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          {clinic.sigungu} 임플란트 치과 전체 보기
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </main>
  )
}
