"use client"

import { useMemo, useState } from "react"

import { ClinicCard } from "@/components/clinic-list"
import type { ClinicWithSlug } from "@/lib/supabase"
import { cn } from "@/lib/utils"

/** 목록이 161곳 정도라 전부 내려주고 시도만 클라이언트에서 거른다. */
export function RecommendList({ clinics }: { clinics: ClinicWithSlug[] }) {
  const [sido, setSido] = useState("all")

  const sidos = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of clinics) counts.set(c.sido, (counts.get(c.sido) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [clinics])

  const filtered = useMemo(
    () => (sido === "all" ? clinics : clinics.filter((c) => c.sido === sido)),
    [clinics, sido]
  )

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {[["all", clinics.length] as const, ...sidos].map(([name, count]) => (
          <button
            key={name}
            type="button"
            onClick={() => setSido(name)}
            aria-pressed={sido === name}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              sido === name
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary"
            )}
          >
            {name === "all" ? "전국" : name}
            <span
              className={cn(
                "tabular-nums",
                sido === name
                  ? "text-primary-foreground/75"
                  : "text-muted-foreground/70"
              )}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">
        총{" "}
        <strong className="text-base font-bold text-foreground tabular-nums">
          {filtered.length.toLocaleString("ko-KR")}
        </strong>
        곳
      </p>

      <ul className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((clinic) => (
          <ClinicCard key={clinic.id} clinic={clinic} />
        ))}
      </ul>
    </div>
  )
}
