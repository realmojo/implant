import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { ClinicList } from "@/components/clinic-list"
import { JsonLd } from "@/components/json-ld"
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/jsonld"
import { shortDong, shortSigungu } from "@/lib/region"
import { getAllDongCounts, getClinicsByDong } from "@/lib/supabase"

export const revalidate = 3600

type Params = { sido: string; sigungu: string; dong: string }

/** 한글 세그먼트는 퍼센트 인코딩된 채로 전달되므로 디코딩해서 쓴다. */
function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

async function readParams(params: Promise<Params>) {
  const { sido, sigungu, dong } = await params
  return {
    sido: decodeSegment(sido),
    sigungu: decodeSegment(sigungu),
    dong: decodeSegment(dong),
  }
}

export async function generateStaticParams(): Promise<Params[]> {
  const rows = await getAllDongCounts()
  return rows.map(({ sido, sigungu, dong }) => ({ sido, sigungu, dong }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { sido, sigungu, dong } = await readParams(params)

  return {
    // "문래동 임플란트 치과" 처럼 실제 검색어 형태 그대로 제목을 만든다.
    title: `${dong} 임플란트 치과`,
    description: `${sigungu} ${dong} 임플란트 치과 목록입니다. ${shortDong(dong)} 임플란트, ${shortSigungu(sigungu)} 임플란트 치과를 찾는다면 진료시간과 야간·일요일·공휴일 진료 여부, 전화번호를 여기서 확인하세요.`,
    alternates: {
      canonical: `/regions/${encodeURIComponent(sido)}/${encodeURIComponent(sigungu)}/${encodeURIComponent(dong)}`,
    },
  }
}

export default async function DongPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { sido, sigungu, dong } = await readParams(params)
  const clinics = await getClinicsByDong(sido, sigungu, dong)

  if (clinics.length === 0) notFound()

  const sigunguHref = `/regions/${encodeURIComponent(sido)}/${encodeURIComponent(sigungu)}`
  const path = `${sigunguHref}/${encodeURIComponent(dong)}`

  return (
    <main className="min-h-svh bg-muted/30">
      <JsonLd
        data={collectionPageJsonLd({
          path,
          name: `${dong} 임플란트 치과`,
          description: `${sido} ${sigungu} ${dong}의 임플란트 치과 ${clinics.length}곳 목록.`,
          clinics,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "홈", path: "/" },
          { name: "지역별 임플란트치과", path: "/regions" },
          { name: `${sido} ${sigungu}`, path: sigunguHref },
          { name: dong, path },
        ])}
      />
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
              <li>
                <Link
                  href={`/regions/${encodeURIComponent(sido)}`}
                  className="hover:text-primary"
                >
                  {sido}
                </Link>
              </li>
              <ChevronRight className="size-3" aria-hidden />
              <li>
                <Link href={sigunguHref} className="hover:text-primary">
                  {sigungu}
                </Link>
              </li>
              <ChevronRight className="size-3" aria-hidden />
              <li aria-current="page" className="font-medium text-foreground">
                {dong}
              </li>
            </ol>
          </nav>

          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            {dong} <span className="text-primary">임플란트 치과</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {sido} {sigungu} {dong}에 있는 임플란트 치과{" "}
            <strong className="font-semibold text-foreground">
              {clinics.length.toLocaleString("ko-KR")}곳
            </strong>
            입니다. {shortDong(dong)} 임플란트 치과를 찾고 있다면 아래 목록에서
            진료시간과 야간·주말 진료 여부를 확인해 보세요.
          </p>

          <Link
            href={sigunguHref}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            {sigungu} 전체 보기
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <ClinicList clinics={clinics} />
      </div>
    </main>
  )
}
