import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/site"
import {
  getAllDongCounts,
  getClinicCount,
  getClinicSlugRange,
  getFeatureCountsBySido,
  getSigunguCountsBySido,
  OPEN_FEATURES,
  type OpenFeature,
} from "@/lib/supabase"

export const revalidate = 3600

const FEATURES = Object.keys(OPEN_FEATURES) as OpenFeature[]

/**
 * 전체 URL 을 /sitemap.xml 하나에 담는다.
 *
 * 치과 상세까지 합쳐 2만여 개로, 구글 상한(50,000개 · 50MB) 안에 들어간다.
 * generateSitemaps 로 쪼개면 /sitemap.xml 인덱스가 생기지 않아
 * 검색엔진에 등록할 대표 주소가 없어진다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  const [groups, dongs, clinicCount, ...featureGroups] = await Promise.all([
    getSigunguCountsBySido(),
    getAllDongCounts(),
    getClinicCount(),
    ...FEATURES.map((f) => getFeatureCountsBySido(f)),
  ])

  const slugs = await getClinicSlugRange(0, clinicCount)

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
    ...dongs.map((d) => entry(`/regions/${d.sido}/${d.sigungu}/${d.dong}`, 0.6)),

    // 치과 상세
    ...slugs.map((slug) => entry(`/${slug}`, 0.5, "monthly")),
  ]
}
