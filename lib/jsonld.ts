import type { Clinic, ClinicWithSlug } from "@/lib/supabase"
import {
  absoluteUrl,
  regionPath,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/site"

/** 한글 요일 → schema.org DayOfWeek. '공휴일'은 PublicHolidays 로 대응된다. */
const DAY_OF_WEEK: Record<string, string> = {
  월요일: "Monday",
  화요일: "Tuesday",
  수요일: "Wednesday",
  목요일: "Thursday",
  금요일: "Friday",
  토요일: "Saturday",
  일요일: "Sunday",
  공휴일: "PublicHolidays",
}

/** "0930" → "09:30" */
function toIsoTime(raw: string) {
  const p = raw.padStart(4, "0")
  return `${p.slice(0, 2)}:${p.slice(2)}`
}

/**
 * { "월요일": "0930 ~ 1830", "일요일": "휴무" }
 * → [{ "@type": "OpeningHoursSpecification", dayOfWeek, opens, closes }]
 *
 * 휴무일과 형식이 깨진 값은 넣지 않는다. 잘못된 영업시간을 내보내는 것보다
 * 비워두는 편이 검색엔진에 안전하다.
 */
export function openingHours(hours: Record<string, string> | null | undefined) {
  if (!hours) return []

  return Object.entries(hours).flatMap(([day, value]) => {
    const dayOfWeek = DAY_OF_WEEK[day]
    if (!dayOfWeek) return []

    const m = value?.match(/^\s*(\d{3,4})\s*~\s*(\d{3,4})\s*$/)
    if (!m) return []

    return [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${dayOfWeek}`,
        opens: toIsoTime(m[1]),
        closes: toIsoTime(m[2]),
      },
    ]
  })
}

/** 사이트 전역 그래프 — 모든 페이지에 실린다. */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        url: absoluteUrl("/"),
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "ko-KR",
        publisher: { "@id": absoluteUrl("/#organization") },
      },
      {
        "@type": "Organization",
        "@id": absoluteUrl("/#organization"),
        name: SITE_NAME,
        url: absoluteUrl("/"),
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/icon.svg"),
        },
      },
    ],
  }
}

export type Crumb = { name: string; path: string }

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  }
}

/** 목록형 페이지(지역·조건별) */
export function collectionPageJsonLd({
  path,
  name,
  description,
  clinics,
}: {
  path: string
  name: string
  description: string
  clinics: ClinicWithSlug[]
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": absoluteUrl(`${path}#page`),
    url: absoluteUrl(path),
    name,
    description,
    inLanguage: "ko-KR",
    isPartOf: { "@id": absoluteUrl("/#website") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: clinics.length,
      // 목록이 아주 길어질 수 있어 상위 항목만 싣는다.
      itemListElement: clinics.slice(0, 50).map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/${c.slug}`),
        name: c.name,
      })),
    },
  }
}

/**
 * 색인형 페이지(지역 목록·조건별 진료 안내).
 * 개별 치과가 아니라 지역 링크를 모아둔 페이지라 ItemList 대신 건수만 싣는다.
 */
export function indexPageJsonLd({
  path,
  name,
  description,
  itemCount,
}: {
  path: string
  name: string
  description: string
  itemCount: number
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": absoluteUrl(`${path}#page`),
    url: absoluteUrl(path),
    name,
    description,
    inLanguage: "ko-KR",
    isPartOf: { "@id": absoluteUrl("/#website") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: itemCount,
    },
  }
}

/**
 * 가이드 문서 한 편.
 *
 * 의료 정보라 MedicalWebPage 를 쓴다. 다만 개별 치과에 대한 평가가 아니라
 * 일반 정보라는 점을 lastReviewed 없이 명확히 두고, 저자는 사이트로 둔다.
 */
export function guideJsonLd(guide: {
  slug: string
  title: string
  description: string
}) {
  const path = `/guide/${guide.slug}`

  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "@id": absoluteUrl(`${path}#article`),
    url: absoluteUrl(path),
    name: guide.title,
    headline: guide.title,
    description: guide.description,
    inLanguage: "ko-KR",
    isPartOf: { "@id": absoluteUrl("/#website") },
    publisher: { "@id": absoluteUrl("/#organization") },
    about: { "@type": "MedicalProcedure", name: "치과 임플란트" },
  }
}

/** 가이드 하단 FAQ. 질문이 없으면 호출하지 않는다. */
export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  }
}

/** 치과 한 곳 (Dentist 는 LocalBusiness·MedicalBusiness 의 하위 타입) */
export function dentistJsonLd(clinic: Clinic & { slug: string }) {
  const path = `/${clinic.slug}`
  const hours = openingHours(clinic.hours)

  return {
    "@context": "https://schema.org",
    "@type": "Dentist",
    "@id": absoluteUrl(`${path}#dentist`),
    url: absoluteUrl(path),
    name: clinic.name,
    description: `${clinic.sido} ${clinic.sigungu}의 임플란트치과 ${clinic.name}`,
    address: {
      "@type": "PostalAddress",
      addressCountry: "KR",
      addressRegion: clinic.sido,
      addressLocality: clinic.sigungu,
      streetAddress: clinic.address,
    },
    areaServed: {
      "@type": "AdministrativeArea",
      name: `${clinic.sido} ${clinic.sigungu}`,
    },
    // 값이 없는 항목은 스키마에서 아예 뺀다.
    ...(clinic.phone ? { telephone: clinic.phone } : {}),
    ...(clinic.naver_map_url ? { hasMap: clinic.naver_map_url } : {}),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    isPartOf: { "@id": absoluteUrl("/#website") },
  }
}

/** 상세 페이지 빵부스러기 (홈 › 지역별 › 시도 시군구 › 치과명) */
export function clinicCrumbs(clinic: Clinic & { slug: string }): Crumb[] {
  return [
    { name: "홈", path: "/" },
    { name: "지역별 임플란트치과", path: "/regions" },
    {
      name: `${clinic.sido} ${clinic.sigungu}`,
      path: regionPath(clinic.sido, clinic.sigungu),
    },
    { name: clinic.name, path: `/${clinic.slug}` },
  ]
}
