"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  CalendarDays,
  ChevronRight,
  ExternalLink,
  Info,
  MapPin,
  Moon,
  Phone,
  Search,
  Sun,
} from "lucide-react"

import type { ClinicWithSlug } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "night", label: "야간 진료" },
  { key: "sunday", label: "일요일 진료" },
  { key: "holiday", label: "공휴일 진료" },
  { key: "saturday", label: "토요일 진료" },
] as const

type FilterKey = (typeof FILTERS)[number]["key"]

const PAGE_SIZE = 30

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

function matchesFilter(clinic: ClinicWithSlug, filter: FilterKey) {
  switch (filter) {
    case "night":
      return clinic.open_night
    case "sunday":
      return clinic.open_sunday
    case "holiday":
      return clinic.open_holiday
    case "saturday":
      return clinic.open_saturday
    default:
      return true
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
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <Icon className="size-3" />
      {children}
    </span>
  )
}

export function ClinicCard({ clinic }: { clinic: ClinicWithSlug }) {
  const weekday = formatHours(clinic.hours?.["월요일"])
  const saturday = formatHours(clinic.hours?.["토요일"])
  const sunday = formatHours(clinic.hours?.["일요일"])
  const hasHours = Boolean(weekday || saturday || sunday)
  const hasContact = Boolean(clinic.phone || clinic.naver_map_url)

  return (
    <li className="flex flex-col rounded-2xl border border-border bg-background p-5 transition-all hover:border-primary hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base leading-snug font-bold text-foreground sm:text-lg">
          {clinic.name}
        </h3>
        {clinic.category ? (
          <span className="mt-0.5 shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {clinic.category}
          </span>
        ) : null}
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-sm leading-relaxed text-muted-foreground">
        <MapPin className="mt-0.5 size-4 shrink-0" />
        <span>{clinic.address}</span>
      </p>

      {clinic.open_night ||
      clinic.open_sunday ||
      clinic.open_holiday ||
      clinic.open_saturday ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {clinic.open_night && <Badge icon={Moon}>야간 진료</Badge>}
          {clinic.open_saturday && <Badge icon={CalendarDays}>토요일</Badge>}
          {clinic.open_sunday && <Badge icon={Sun}>일요일</Badge>}
          {clinic.open_holiday && <Badge icon={CalendarDays}>공휴일</Badge>}
        </div>
      ) : null}

      {hasHours ? (
        <dl className="mt-4 divide-y divide-border rounded-xl bg-muted/50 px-3.5 text-sm">
          {[
            { label: "평일", value: weekday },
            { label: "토요일", value: saturday },
            { label: "일요일", value: sunday },
          ]
            .filter((row) => row.value)
            .map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 py-2"
              >
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-medium text-foreground tabular-nums">
                  {row.value}
                </dd>
              </div>
            ))}
        </dl>
      ) : null}

      {!hasHours && !hasContact ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border px-3.5 py-3 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" />
          진료시간·전화번호 정보가 제공되지 않습니다.
        </p>
      ) : !hasHours ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border px-3.5 py-3 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" />
          진료시간 정보가 제공되지 않습니다.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
        {clinic.phone ? (
          <a
            href={`tel:${clinic.phone.replace(/[^0-9+]/g, "")}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
          >
            <Phone className="size-4" />
            {clinic.phone}
          </a>
        ) : null}
        <Link
          href={`/${clinic.slug}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          상세 보기
          <ChevronRight className="size-4" />
        </Link>
        {clinic.naver_map_url ? (
          <a
            href={clinic.naver_map_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <ExternalLink className="size-4" />
            지도 보기
          </a>
        ) : null}
      </div>
    </li>
  )
}

function isFilterKey(value: string | null): value is FilterKey {
  return FILTERS.some((f) => f.key === value)
}

function subscribeToUrl(onChange: () => void) {
  window.addEventListener("popstate", onChange)
  return () => window.removeEventListener("popstate", onChange)
}

/**
 * `?f=night` 처럼 URL에 걸린 초기 필터.
 *
 * 지역 상세는 정적으로 생성되므로 서버 스냅샷은 항상 null이고(전체 목록이 HTML에 남는다),
 * 쿼리스트링은 하이드레이션 이후 클라이언트에서만 반영된다.
 */
function useUrlFilter(): FilterKey | null {
  const raw = useSyncExternalStore(
    subscribeToUrl,
    () => new URLSearchParams(window.location.search).get("f"),
    () => null
  )
  return isFilterKey(raw) ? raw : null
}

export function ClinicList({ clinics }: { clinics: ClinicWithSlug[] }) {
  // 야간/일요일/공휴일 페이지에서 넘어오면 필터가 미리 걸린 상태로 열린다.
  // 사용자가 칩을 누르면 그 선택이 URL보다 우선한다.
  const urlFilter = useUrlFilter()
  const [picked, setPicked] = useState<FilterKey | null>(null)
  const filter = picked ?? urlFilter ?? "all"

  const [dong, setDong] = useState("all")
  const [query, setQuery] = useState("")
  const [visible, setVisible] = useState(PAGE_SIZE)

  const dongs = useMemo(
    () =>
      [...new Set(clinics.map((c) => c.dong).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "ko")
      ),
    [clinics]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clinics.filter(
      (c) =>
        matchesFilter(c, filter) &&
        (dong === "all" || c.dong === dong) &&
        (!q ||
          c.name.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q))
    )
  }, [clinics, filter, dong, query])

  const counts = useMemo(
    () => ({
      all: clinics.length,
      night: clinics.filter((c) => c.open_night).length,
      sunday: clinics.filter((c) => c.open_sunday).length,
      holiday: clinics.filter((c) => c.open_holiday).length,
      saturday: clinics.filter((c) => c.open_saturday).length,
    }),
    [clinics]
  )

  function reset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setVisible(PAGE_SIZE)
    }
  }

  return (
    <div>
      <div className="space-y-5 rounded-2xl border border-border bg-background p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => reset(setQuery)(e.target.value)}
            placeholder="치과명 · 주소 검색"
            aria-label="치과명 또는 주소 검색"
            className="h-12 w-full rounded-xl border border-border bg-background pr-4 pl-11 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
            진료 조건
          </p>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => reset(setPicked)(f.key)}
                aria-pressed={filter === f.key}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  filter === f.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "tabular-nums",
                    filter === f.key
                      ? "text-primary-foreground/75"
                      : "text-muted-foreground/70"
                  )}
                >
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {dongs.length > 1 ? (
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
              동 선택
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["all", ...dongs].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => reset(setDong)(d)}
                  aria-pressed={dong === d}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    dong === d
                      ? "bg-foreground font-medium text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d === "all" ? "전체" : d}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
        총{" "}
        <strong className="text-base font-bold text-foreground tabular-nums">
          {filtered.length.toLocaleString("ko-KR")}
        </strong>
        곳
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          조건에 맞는 임플란트치과가 없습니다.
          <br />
          검색어나 필터를 바꿔보세요.
        </p>
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filtered.slice(0, visible).map((clinic) => (
              <ClinicCard key={clinic.id} clinic={clinic} />
            ))}
          </ul>

          {visible < filtered.length ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold transition-colors outline-none hover:border-primary hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                더보기 ({(filtered.length - visible).toLocaleString("ko-KR")}곳
                남음)
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
