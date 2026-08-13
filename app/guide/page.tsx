import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { AdBanner } from "@/components/adsense"
import { AD_SLOTS } from "@/lib/adsense"
import { JsonLd } from "@/components/json-ld"
import { breadcrumbJsonLd, indexPageJsonLd } from "@/lib/jsonld"
import { GUIDES } from "@/lib/guides"

export const revalidate = 3600

const TITLE = "임플란트 정보 가이드"
const DESCRIPTION =
  "임플란트 비용 구조, 만 65세 이상 건강보험 적용 조건, 시술 과정과 기간, 시술 후 관리까지 치과에 가기 전 알아두면 좋은 내용을 정리했습니다."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guide" },
}

export default function GuideIndexPage() {
  return (
    <>
      <JsonLd
        data={indexPageJsonLd({
          path: "/guide",
          name: TITLE,
          description: DESCRIPTION,
          itemCount: GUIDES.length,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "홈", path: "/" },
          { name: TITLE, path: "/guide" },
        ])}
      />

      <main className="min-h-svh bg-muted/30">
        <div className="border-b border-border bg-background">
          <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
            <nav aria-label="위치" className="text-xs text-muted-foreground">
              <ol className="flex flex-wrap items-center gap-1">
                <li>
                  <Link href="/" className="hover:text-primary">
                    홈
                  </Link>
                </li>
                <ChevronRight className="size-3" aria-hidden />
                <li aria-current="page" className="font-medium text-foreground">
                  {TITLE}
                </li>
              </ol>
            </nav>

            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              임플란트 <span className="text-primary">정보 가이드</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {DESCRIPTION}
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {GUIDES.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`/guide/${guide.slug}`}
                  className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-background p-5 transition-all outline-none hover:border-primary hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-foreground group-hover:text-primary">
                      {guide.title}
                    </h2>
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {guide.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <AdBanner slot={AD_SLOTS.bottom} className="mt-8 px-0 sm:px-0" />

          <p className="mt-8 rounded-xl border border-dashed border-border px-4 py-4 text-xs leading-relaxed text-muted-foreground">
            이 가이드는 일반적인 정보 제공을 위한 것으로 진단이나 치료를
            대신하지 않습니다. 실제 치료 방법과 비용은 구강 상태에 따라
            달라지므로 치과 상담을 통해 확인하세요.
          </p>
        </div>
      </main>
    </>
  )
}
