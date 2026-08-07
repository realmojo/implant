import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { AdBanner } from "@/components/adsense"
import { AD_SLOTS } from "@/lib/adsense"
import { ClinicList } from "@/components/clinic-list"
import { JsonLd } from "@/components/json-ld"
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/jsonld"
import { regionPath } from "@/lib/site"
import { shortSigungu } from "@/lib/region"
import {
  getAllSigunguPairs,
  getClinicsBySigungu,
  getDongCountsBySigungu,
} from "@/lib/supabase"

export const revalidate = 3600

type Params = { sido: string; sigungu: string }

/** 한글 세그먼트는 퍼센트 인코딩된 채로 전달되므로 디코딩해서 쓴다. */
function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

async function readParams(params: Promise<Params>) {
  const { sido, sigungu } = await params
  return { sido: decodeSegment(sido), sigungu: decodeSegment(sigungu) }
}

export async function generateStaticParams(): Promise<Params[]> {
  const pairs = await getAllSigunguPairs()
  return pairs.map(({ sido, sigungu }) => ({ sido, sigungu }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { sido, sigungu } = await readParams(params)
  const short = shortSigungu(sigungu)

  return {
    // "강남구 임플란트 치과" 처럼 실제 검색어 형태를 그대로 쓴다.
    title: `${sigungu} 임플란트 치과`,
    description: `${sido} ${sigungu} 임플란트 치과 목록입니다. ${short} 임플란트, ${short} 임플란트 치과를 찾는다면 진료시간과 야간·일요일·공휴일 진료 여부, 전화번호를 여기서 확인하세요.`,
    alternates: { canonical: regionPath(sido, sigungu) },
  }
}

export default async function SigunguPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { sido, sigungu } = await readParams(params)
  const [clinics, dongs] = await Promise.all([
    getClinicsBySigungu(sido, sigungu),
    getDongCountsBySigungu(sido, sigungu),
  ])

  if (clinics.length === 0) notFound()

  const path = regionPath(sido, sigungu)

  return (
    <>
      <JsonLd
        data={collectionPageJsonLd({
          path,
          name: `${sido} ${sigungu} 임플란트치과`,
          description: `${sido} ${sigungu}의 임플란트치과 ${clinics.length}곳 목록.`,
          clinics,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "홈", path: "/" },
          { name: "지역별 임플란트치과", path: "/regions" },
          { name: `${sido} ${sigungu}`, path },
        ])}
      />

      <main className="min-h-svh bg-muted/30">
        <div className="border-b border-border bg-background">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
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
                  {sido} {sigungu}
                </li>
              </ol>
            </nav>

            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              {sigungu} <span className="text-primary">임플란트 치과</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {sido} {sigungu}에 등록된 임플란트 치과{" "}
              <strong className="font-semibold text-foreground">
                {clinics.length.toLocaleString("ko-KR")}곳
              </strong>
              입니다. {shortSigungu(sigungu)} 임플란트 치과를 찾고 있다면
              진료시간과 야간·주말 진료 여부를 확인해 보세요.
            </p>
          </div>
        </div>

        {dongs.length > 1 ? (
          <div className="border-b border-border bg-background">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {sigungu} 읍면동별 임플란트 치과
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {dongs.map((d) => (
                  <li key={d.dong}>
                    <Link
                      href={`${path}/${encodeURIComponent(d.dong)}`}
                      className="inline-flex items-baseline gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary"
                    >
                      {d.dong}
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {d.cnt}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <AdBanner slot={AD_SLOTS.top} className="pt-8" />

        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">

          <ClinicList clinics={clinics} />
        </div>
        <AdBanner slot={AD_SLOTS.bottom} className="pb-10" />

      </main>
    </>
  )
}
