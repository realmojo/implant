import type { MetadataRoute } from "next"

import { absoluteUrl, SITE_URL } from "@/lib/site"
import { CLINICS_PER_SITEMAP } from "@/lib/sitemap"
import { getClinicCount } from "@/lib/supabase"

export const revalidate = 3600

export default async function robots(): Promise<MetadataRoute.Robots> {
  // generateSitemaps 는 /sitemap/0.xml … 만 만들고 인덱스(/sitemap.xml)는
  // 만들어 주지 않는다. 그래서 조각들을 robots.txt 에 직접 나열한다.
  const count = await getClinicCount()
  const sitemapCount = Math.ceil(count / CLINICS_PER_SITEMAP) + 1

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 필터 쿼리는 같은 목록의 중복 URL 이라 색인에서 제외한다.
        disallow: ["/*?f=", "/api/"],
      },
    ],
    sitemap: Array.from({ length: sitemapCount }, (_, i) =>
      absoluteUrl(`/sitemap/${i}.xml`)
    ),
    host: SITE_URL,
  }
}
