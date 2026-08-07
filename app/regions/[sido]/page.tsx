import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { JsonLd } from "@/components/json-ld"
import { RegionGrid, SidoJumpNav } from "@/components/region-grid"
import { breadcrumbJsonLd, indexPageJsonLd } from "@/lib/jsonld"
import { getSigunguCountsBySido } from "@/lib/supabase"

export const revalidate = 3600

type Params = { sido: string }

/** 한글 세그먼트는 퍼센트 인코딩된 채로 전달되므로 디코딩해서 쓴다. */
function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export async function generateStaticParams(): Promise<Params[]> {
  const groups = await getSigunguCountsBySido()
  return groups.map((group) => ({ sido: group.sido }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const sido = decodeSegment((await params).sido)

  return {
    title: `${sido} 임플란트치과`,
    description: `${sido}의 시군구별 임플란트치과 목록. 진료시간과 야간·일요일·공휴일 진료 여부를 확인하세요.`,
  }
}

export default async function SidoPage({
  params,
}: {
  params: Promise<Params>
}) {
  const sido = decodeSegment((await params).sido)
  const groups = await getSigunguCountsBySido()
  const group = groups.find((g) => g.sido === sido)

  if (!group) notFound()

  const sum = (key: "night_cnt" | "sunday_cnt" | "holiday_cnt") =>
    group.items.reduce((acc, item) => acc + item[key], 0)

  const path = `/regions/${encodeURIComponent(sido)}`

  return (
    <main className="min-h-svh bg-muted/30">
      <JsonLd
        data={indexPageJsonLd({
          path,
          name: `${sido} 임플란트치과`,
          description: `${sido}의 시군구별 임플란트치과 목록.`,
          itemCount: group.total,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "홈", path: "/" },
          { name: "지역별 임플란트치과", path: "/regions" },
          { name: sido, path },
        ])}
      />

      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
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
              <li aria-current="page" className="font-medium text-foreground">
                {sido}
              </li>
            </ol>
          </nav>

          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            {sido} <span className="text-primary">임플란트치과</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            시군구를 선택하면 해당 지역의 치과 목록과 진료시간을 볼 수 있습니다.
          </p>

          <dl className="mt-7 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
            {[
              { label: "시군구", value: group.items.length },
              { label: "등록 치과", value: group.total },
              { label: "야간 진료", value: sum("night_cnt") },
              { label: "일요일 진료", value: sum("sunday_cnt") },
            ].map((stat) => (
              <div key={stat.label} className="bg-background px-4 py-4">
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-xl font-bold tracking-tight tabular-nums">
                  {stat.value.toLocaleString("ko-KR")}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <SidoJumpNav groups={groups} activeSido={sido} />
      <RegionGrid groups={[group]} />
    </main>
  )
}
