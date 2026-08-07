import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/site"
import { CLINICS_PER_SITEMAP } from "@/lib/sitemap"
import {
  getAllDongCounts,
  getClinicCount,
  getClinicSlugRange,
  getFeatureCountsBySido,
  getSigunguCountsBySido,
  OPEN_FEATURES,
  type OpenFeature,
} from "@/lib/supabase"

const FEATURES = Object.keys(OPEN_FEATURES) as OpenFeature[]

/**
 * 0번은 고정·지역 페이지, 1번부터는 치과 상세 URL 묶음.
 * 결과는 /sitemap/0.xml, /sitemap/1.xml … 로 나온다.
 */
export async function generateSitemaps() {
  const count = await getClinicCount()
  const clinicSitemaps = Math.ceil(count / CLINICS_PER_SITEMAP)
  return Array.from({ length: clinicSitemaps + 1 }, (_, id) => ({ id }))
}

async function staticAndRegionUrls(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()
  const [groups, dongs, ...featureGroups] = await Promise.all([
    getSigunguCountsBySido(),
    getAllDongCounts(),
    ...FEATURES.map((f) => getFeatureCountsBySido(f)),
  ])

  const entry = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly"
  ) => ({ url: absoluteUrl(path), lastModified, changeFrequency, priority })

  return [
    entry("/", 1, "daily"),
    entry("/regions", 0.9),
    entry("/recommend", 0.8),
    ...FEATURES.map((f) => entry(`/${f}`, 0.8)),

    // 시도 색인 — 지역별 + 조건별
    ...groups.map((g) => entry(`/regions/${g.sido}`, 0.7)),
    ...FEATURES.flatMap((f, i) =>
      featureGroups[i].map((g) => entry(`/${f}/${g.sido}`, 0.6))
    ),

    // 시군구 목록
    ...groups.flatMap((g) =>
      g.items.map((item) => entry(`/regions/${g.sido}/${item.sigungu}`, 0.7))
    ),

    // 읍면동 목록 — "문래동 임플란트" 같은 검색어를 받는 페이지
    ...dongs.map((d) =>
      entry(`/regions/${d.sido}/${d.sigungu}/${d.dong}`, 0.6)
    ),
  ]
}

export default async function sitemap({
  id,
}: {
  // 이 버전에서는 id 가 Promise 로 넘어온다. await 하지 않으면 NaN 이 되어 빈 사이트맵이 나온다.
  id: Promise<string> | string | number
}): Promise<MetadataRoute.Sitemap> {
  const index = Number(await id)

  if (index === 0) return staticAndRegionUrls()

  const slugs = await getClinicSlugRange(
    (index - 1) * CLINICS_PER_SITEMAP,
    CLINICS_PER_SITEMAP
  )
  const lastModified = new Date()

  return slugs.map((slug) => ({
    url: absoluteUrl(`/${slug}`),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }))
}
