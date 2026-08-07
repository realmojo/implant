import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { AdBanner } from "@/components/adsense"
import { AD_SLOTS } from "@/lib/adsense"
import { JsonLd } from "@/components/json-ld"
import { RegionGrid, SidoJumpNav } from "@/components/region-grid"
import { breadcrumbJsonLd, indexPageJsonLd } from "@/lib/jsonld"
import { getFeatureCountsBySido, type OpenFeature } from "@/lib/supabase"

const FEATURE_META = {
  night: {
    title: "야간 진료",
    countKey: "night_cnt",
    lead: "저녁 8시 이후까지 진료하는 임플란트치과입니다. 퇴근 후에 들를 수 있는 곳을 지역별로 찾아보세요.",
  },
  holiday: {
    title: "공휴일 진료",
    countKey: "holiday_cnt",
    lead: "공휴일에도 문을 여는 임플란트치과입니다. 갑작스러운 통증에 대비해 미리 확인해 두세요.",
  },
  sunday: {
    title: "일요일 진료",
    countKey: "sunday_cnt",
    lead: "일요일에 진료하는 임플란트치과입니다. 주말에만 시간이 나는 분들을 위한 목록입니다.",
  },
} as const satisfies Record<
  OpenFeature,
  {
    title: string
    countKey: "night_cnt" | "holiday_cnt" | "sunday_cnt"
    lead: string
  }
>

/**
 * 야간·공휴일·일요일 진료 페이지 공통 레이아웃.
 * sido 를 주면 그 시도만 보여준다 (`/night/서울특별시`).
 */
export async function FeaturePage({
  feature,
  sido,
}: {
  feature: OpenFeature
  sido?: string
}) {
  const meta = FEATURE_META[feature]
  const allGroups = await getFeatureCountsBySido(feature)

  if (sido && !allGroups.some((g) => g.sido === sido)) notFound()

  const groups = sido ? allGroups.filter((g) => g.sido === sido) : allGroups
  const total = groups.reduce((sum, g) => sum + g.total, 0)
  const sigunguTotal = groups.reduce((sum, g) => sum + g.items.length, 0)

  // 시도 페이지(`/night/서울특별시`)와 전국 페이지의 구조화 데이터를 구분한다.
  const rootPath = `/${feature}`
  const rootName = `${meta.title} 임플란트치과`
  const path = sido ? `${rootPath}/${encodeURIComponent(sido)}` : rootPath
  const pageName = sido ? `${sido} ${rootName}` : rootName

  return (
    <>
      <JsonLd
        data={indexPageJsonLd({
          path,
          name: pageName,
          description: sido
            ? `${sido}에서 ${meta.title}하는 임플란트치과를 시군구별로 찾아보세요.`
            : meta.lead,
          itemCount: total,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd(
          sido
            ? [
                { name: "홈", path: "/" },
                { name: rootName, path: rootPath },
                { name: sido, path },
              ]
            : [
                { name: "홈", path: "/" },
                { name: rootName, path: rootPath },
              ]
        )}
      />

      <main className="min-h-svh bg-muted/30">
        <div className="border-b border-border bg-background">
          <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            {sido ? (
              <nav
                aria-label="위치"
                className="mb-4 text-xs text-muted-foreground"
              >
                <ol className="flex flex-wrap items-center gap-1">
                  <li>
                    <Link href="/" className="hover:text-primary">
                      홈
                    </Link>
                  </li>
                  <ChevronRight className="size-3" aria-hidden />
                  <li>
                    <Link href={`/${feature}`} className="hover:text-primary">
                      {meta.title} 임플란트치과
                    </Link>
                  </li>
                  <ChevronRight className="size-3" aria-hidden />
                  <li
                    aria-current="page"
                    className="font-medium text-foreground"
                  >
                    {sido}
                  </li>
                </ol>
              </nav>
            ) : null}

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {sido ? `${sido} ` : ""}
              <span className="text-primary">{meta.title}</span> 임플란트치과
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {meta.lead}
            </p>

            <dl className="mt-8 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border">
              {[
                { label: "시도", value: groups.length },
                { label: "시군구", value: sigunguTotal },
                { label: `${meta.title} 치과`, value: total },
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

            <p className="mt-4 text-sm text-muted-foreground">
              시군구를 선택하면 {meta.title} 조건이 적용된 목록이 바로 열립니다.
            </p>
          </div>
        </div>

        <AdBanner slot={AD_SLOTS.top} className="pt-8" />

        <SidoJumpNav
          groups={allGroups}
          basePath={`/${feature}`}
          activeSido={sido}
        />
        <RegionGrid
          groups={groups}
          countKey={meta.countKey}
          filterParam={feature}
          basePath={sido ? undefined : `/${feature}`}
        />
        <AdBanner slot={AD_SLOTS.bottom} className="pb-10" />

      </main>
    </>
  )
}

export { FEATURE_META }
