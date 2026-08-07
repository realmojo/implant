"use client"

import { useId, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CornerDownLeft, Search } from "lucide-react"

export type RegionEntry = {
  sido: string
  sigungu: string
  cnt: number
}

const MAX_RESULTS = 7

function regionHref(entry: RegionEntry) {
  return `/regions/${encodeURIComponent(entry.sido)}/${encodeURIComponent(entry.sigungu)}`
}

/**
 * 시군구 즉시 검색. 280개뿐이라 서버 왕복 없이 클라이언트에서 거른다.
 * 입력이 비어 있으면 목록을 띄우지 않아 지면이 흔들리지 않는다.
 */
export function RegionSearch({ regions }: { regions: RegionEntry[] }) {
  const router = useRouter()
  const listId = useId()
  const [query, setQuery] = useState("")

  const results = useMemo(() => {
    const q = query.trim().replace(/\s+/g, "")
    if (!q) return []
    return regions
      .filter(
        (r) => r.sigungu.replace(/\s+/g, "").includes(q) || r.sido.startsWith(q)
      )
      .slice(0, MAX_RESULTS)
  }, [regions, query])

  return (
    <div className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (results[0]) router.push(regionHref(results[0]))
        }}
        className="flex items-center gap-3 border border-foreground/20 bg-background px-4 py-3.5 transition-colors focus-within:border-primary sm:px-5"
      >
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="시군구로 찾기 — 예: 강남구, 성남시 분당구"
          aria-label="시군구 검색"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={results.length > 0}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
        />
        {query.trim() ? (
          <span className="hidden shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground sm:inline-flex">
            <CornerDownLeft className="size-3.5" />
            이동
          </span>
        ) : (
          <span className="shrink-0 font-mono text-xs tracking-[0.14em] text-muted-foreground/70 uppercase">
            {regions.length}개 시군구
          </span>
        )}
      </form>

      {query.trim() ? (
        <ul
          id={listId}
          className="absolute inset-x-0 top-full z-30 mt-1 border border-foreground/20 bg-background shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-5 py-4 text-sm text-muted-foreground">
              일치하는 시군구가 없습니다.
            </li>
          ) : (
            results.map((r) => (
              <li
                key={`${r.sido}-${r.sigungu}`}
                className="dossier-hairline first:border-t-0"
              >
                <Link
                  href={regionHref(r)}
                  className="flex items-baseline gap-3 px-5 py-3 outline-none hover:bg-muted focus-visible:bg-muted"
                >
                  <span className="font-semibold">{r.sigungu}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.sido}
                  </span>
                  <span className="dossier-leader" aria-hidden />
                  <span className="shrink-0 font-mono text-sm tabular-nums">
                    {r.cnt.toLocaleString("ko-KR")}곳
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
