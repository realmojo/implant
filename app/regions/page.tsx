import type { Metadata } from "next"

import { AdBanner } from "@/components/adsense"
import { AD_SLOTS } from "@/lib/adsense"
import { RegionGrid, SidoJumpNav } from "@/components/region-grid"
import { JsonLd } from "@/components/json-ld"
import { breadcrumbJsonLd, indexPageJsonLd } from "@/lib/jsonld"
import { getSigunguCountsBySido } from "@/lib/supabase"

export const metadata: Metadata = {
  title: "지역별 임플란트치과",
  description:
    "전국 시도·시군구별 임플란트치과 수를 확인하고 우리 동네 치과를 찾아보세요.",
}

/** 집계 뷰는 자주 바뀌지 않으므로 1시간 단위로 재생성 */
export const revalidate = 3600

export default async function RegionsPage() {
  const groups = await getSigunguCountsBySido()
  const total = groups.reduce((sum, g) => sum + g.total, 0)
  const sigunguTotal = groups.reduce((sum, g) => sum + g.items.length, 0)

  return (
    <>
      <JsonLd
        data={indexPageJsonLd({
          path: "/regions",
          name: "지역별 임플란트치과",
          description:
            "전국 시도·시군구별 임플란트치과 수를 확인하고 우리 동네 치과를 찾아보세요.",
          itemCount: total,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "홈", path: "/" },
          { name: "지역별 임플란트치과", path: "/regions" },
        ])}
      />

      <main className="min-h-svh bg-muted/30">
        <div className="border-b border-border bg-background">
          <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              지역별 <span className="text-primary">임플란트치과</span>
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              우리 동네 임플란트치과를 지역별로 찾아보세요. 시군구를 선택하면
              진료시간과 야간·주말 진료 여부까지 확인할 수 있습니다.
            </p>

            <dl className="mt-8 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border">
              {[
                { label: "시도", value: groups.length },
                { label: "시군구", value: sigunguTotal },
                { label: "등록 치과", value: total },
              ].map((stat) => (
                <div key={stat.label} className="bg-background px-4 py-4">
                  <dt className="text-xs text-muted-foreground">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 text-xl font-bold tracking-tight tabular-nums">
                    {stat.value.toLocaleString("ko-KR")}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <AdBanner slot={AD_SLOTS.top} className="pt-8" />

        <SidoJumpNav groups={groups} />
        <RegionGrid groups={groups} basePath="/regions" />
        <AdBanner slot={AD_SLOTS.bottom} className="pb-10" />

      </main>
    </>
  )
}
