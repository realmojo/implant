import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { AdSense } from "@/components/adsense"
import { AD_SLOTS } from "@/lib/adsense"
import { JsonLd } from "@/components/json-ld"
import { breadcrumbJsonLd, faqJsonLd, guideJsonLd } from "@/lib/jsonld"
import { GUIDES, GUIDE_BY_SLUG } from "@/lib/guides"

export const revalidate = 3600

type Params = { slug: string }

export function generateStaticParams(): Params[] {
  return GUIDES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const guide = GUIDE_BY_SLUG.get(slug)

  if (!guide) return { title: "찾을 수 없는 문서" }

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guide/${guide.slug}` },
  }
}

export default async function GuidePage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const guide = GUIDE_BY_SLUG.get(slug)

  if (!guide) notFound()

  const others = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 4)

  return (
    <>
      <JsonLd data={guideJsonLd(guide)} />
      <JsonLd data={faqJsonLd(guide.faq)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "홈", path: "/" },
          { name: "임플란트 정보 가이드", path: "/guide" },
          { name: guide.title, path: `/guide/${guide.slug}` },
        ])}
      />

      <main className="min-h-svh bg-muted/30">
        <div className="border-b border-border bg-background">
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
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
                  <Link href="/guide" className="hover:text-primary">
                    임플란트 정보 가이드
                  </Link>
                </li>
                <ChevronRight className="size-3" aria-hidden />
                <li aria-current="page" className="font-medium text-foreground">
                  {guide.short}
                </li>
              </ol>
            </nav>

            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              {guide.title}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {guide.description}
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <article className="space-y-8">
            {guide.sections.map((section, i) => (
              <section key={section.heading}>
                <h2 className="mb-3 text-lg font-bold tracking-tight">
                  {section.heading}
                </h2>
                <div className="space-y-3">
                  {section.body.map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 24)}
                      className="text-[15px] leading-[1.85] text-foreground/85"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
                {/* 본문 중간에 한 칸. 첫 단락을 다 읽은 위치다. */}
                {i === 0 ? (
                  <AdSense slot={AD_SLOTS.middle} className="mt-8" />
                ) : null}
              </section>
            ))}
          </article>

          {guide.faq.length > 0 ? (
            <section className="mt-10">
              <h2 className="mb-3 text-lg font-bold tracking-tight">
                자주 묻는 질문
              </h2>
              <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {guide.faq.map((item) => (
                  <div key={item.q} className="bg-background px-4 py-4">
                    <dt className="font-semibold text-foreground">{item.q}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <AdSense slot={AD_SLOTS.bottom} className="mt-10" />

          <section className="mt-10">
            <h2 className="mb-4 text-lg font-bold tracking-tight">
              함께 읽으면 좋은 글
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {others.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guide/${g.slug}`}
                    className="group flex h-full items-start justify-between gap-2 rounded-xl border border-border bg-background p-4 transition-all outline-none hover:border-primary hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="text-sm font-medium text-foreground group-hover:text-primary">
                      {g.title}
                    </span>
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-10 rounded-xl border border-dashed border-border px-4 py-4 text-xs leading-relaxed text-muted-foreground">
            이 문서는 일반적인 정보 제공을 위한 것으로 진단이나 치료를 대신하지
            않습니다. 실제 치료 방법과 비용은 구강 상태에 따라 달라지므로 치과
            상담을 통해 확인하세요.
          </p>

          <Link
            href="/guide"
            className="mt-8 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
          >
            임플란트 정보 가이드 전체 보기
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </main>
    </>
  )
}
