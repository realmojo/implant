import type { MetadataRoute } from "next"

import { absoluteUrl, SITE_URL } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 필터 쿼리는 같은 목록의 중복 URL 이라 색인에서 제외한다.
        disallow: ["/*?f=", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  }
}
