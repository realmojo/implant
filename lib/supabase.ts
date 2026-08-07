import { cache } from "react"
import { createClient } from "@supabase/supabase-js"

import { buildClinicSlug, dupKey, slugStartsWithSigungu } from "@/lib/slug"
import { baseDong } from "@/lib/region"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
})

/** implant_sigungu_counts 뷰의 한 행 (시군구별 임플란트치과 집계) */
export interface SigunguCount {
  sido: string
  sigungu: string
  cnt: number
  sunday_cnt: number
  holiday_cnt: number
  night_cnt: number
}

/** 시도 표기 순서 (행정구역 관례). 목록에 없는 시도는 뒤에 붙는다. */
const SIDO_ORDER = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
]

export interface SidoGroup {
  sido: string
  total: number
  items: SigunguCount[]
}

/** implant_lists 테이블의 한 행 (임플란트치과 한 곳) */
export interface Clinic {
  id: number
  name: string
  address: string
  phone: string | null
  category: string | null
  sido: string
  sigungu: string
  dong: string
  /** { "월요일": "0930 ~ 1800", "일요일": "휴무", ... } */
  hours: Record<string, string>
  tags: string[]
  open_sunday: boolean
  open_holiday: boolean
  open_saturday: boolean
  open_night: boolean
  naver_map_url: string | null
}

/** 상세 페이지 링크용 슬러그가 붙은 치과 */
export type ClinicWithSlug = Clinic & { slug: string }

const CLINIC_COLUMNS =
  "id, name, address, phone, category, sido, sigungu, dong, hours, tags, open_sunday, open_holiday, open_saturday, open_night, naver_map_url"

/**
 * (시군구, 치과명)이 전국에 2곳 이상인 조합들. 슬러그 뒤에 id를 붙일지 판별한다.
 * 요청 단위로 캐시해서 목록/상세가 같은 결과를 쓰도록 한다.
 */
export const getDuplicateNameKeys = cache(async (): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from("implant_dup_names")
    .select("sigungu, name")
    .limit(5000)

  if (error) throw error
  return new Set(
    (data ?? []).map((r: { sigungu: string; name: string }) =>
      dupKey(r.sigungu, r.name)
    )
  )
})

async function withSlugs(clinics: Clinic[]): Promise<ClinicWithSlug[]> {
  const duplicated = await getDuplicateNameKeys()
  return clinics.map((c) => ({
    ...c,
    slug: buildClinicSlug(c, duplicated.has(dupKey(c.sigungu, c.name))),
  }))
}

/** 특정 시군구의 임플란트치과 전체 목록 (이름 가나다순) */
export async function getClinicsBySigungu(
  sido: string,
  sigungu: string
): Promise<ClinicWithSlug[]> {
  const { data, error } = await supabase
    .from("implant_lists")
    .select(CLINIC_COLUMNS)
    .eq("sido", sido)
    .eq("sigungu", sigungu)
    .order("name")
    // 한 시군구 최대 규모(강남구 528곳)보다 넉넉하게. PostgREST 기본 상한 회피용.
    .limit(2000)

  if (error) throw error
  return withSlugs((data ?? []) as Clinic[])
}

/** PostgREST 는 한 번에 1000행까지만 준다. 그 이상은 range 로 이어 받는다. */
const PAGE_SIZE = 1000

/** 시도 구분 없이 같은 이름의 시군구 전체 (예: '남구' → 광주·부산·대구·울산) */
const getClinicsBySigunguName = cache(
  async (sigungu: string): Promise<ClinicWithSlug[]> => {
    const rows: Clinic[] = []

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("implant_lists")
        .select(CLINIC_COLUMNS)
        .eq("sigungu", sigungu)
        .order("name")
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw error
      rows.push(...((data ?? []) as Clinic[]))
      if (!data || data.length < PAGE_SIZE) break
    }

    return withSlugs(rows)
  }
)

export interface DongCount {
  sido: string
  sigungu: string
  dong: string
  cnt: number
}

/** "문래동3가" 같은 세부 동을 대표 이름(문래동)으로 합친다. */
function mergeByBaseDong(rows: DongCount[]): DongCount[] {
  const merged = new Map<string, DongCount>()

  for (const row of rows) {
    const dong = baseDong(row.dong)
    const key = `${row.sido}|${row.sigungu}|${dong}`
    const hit = merged.get(key)
    if (hit) hit.cnt += row.cnt
    else merged.set(key, { ...row, dong })
  }

  return [...merged.values()]
}

/** 한 시군구의 읍면동 목록 (많은 순, 대표 이름 기준) */
export const getDongCountsBySigungu = cache(
  async (sido: string, sigungu: string): Promise<DongCount[]> => {
    const { data, error } = await supabase
      .from("implant_dong_counts")
      .select("sido, sigungu, dong, cnt")
      .eq("sido", sido)
      .eq("sigungu", sigungu)

    if (error) throw error
    return mergeByBaseDong((data ?? []) as DongCount[]).sort(
      (a, b) => b.cnt - a.cnt || a.dong.localeCompare(b.dong, "ko")
    )
  }
)

/** 전체 읍면동 조합 (정적 경로·사이트맵 생성용, 대표 이름 기준) */
export async function getAllDongCounts(): Promise<DongCount[]> {
  const rows: DongCount[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("implant_dong_counts")
      .select("sido, sigungu, dong, cnt")
      .order("sido")
      .order("sigungu")
      .order("dong")
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    rows.push(...((data ?? []) as DongCount[]))
    if (!data || data.length < PAGE_SIZE) break
  }

  return mergeByBaseDong(rows)
}

/**
 * 특정 읍면동의 치과 목록.
 * dong 은 대표 이름(문래동)이라 문래동1~6가를 모두 포함한다.
 */
export async function getClinicsByDong(
  sido: string,
  sigungu: string,
  dong: string
): Promise<ClinicWithSlug[]> {
  const clinics = await getClinicsBySigungu(sido, sigungu)
  return clinics.filter((c) => baseDong(c.dong) === dong)
}

/**
 * 같은 지역의 다른 치과. 같은 읍면동을 먼저, 그다음 같은 시군구에서 채운다.
 * 정보가 있는 곳(전화·진료시간)과 야간·주말 진료하는 곳을 앞에 둔다.
 */
export async function getNearbyClinics(
  clinic: ClinicWithSlug,
  limit = 6
): Promise<ClinicWithSlug[]> {
  const all = await getClinicsBySigungu(clinic.sido, clinic.sigungu)
  const dong = baseDong(clinic.dong)

  const score = (c: ClinicWithSlug) =>
    (baseDong(c.dong) === dong ? 8 : 0) +
    (c.phone ? 2 : 0) +
    (Object.keys(c.hours ?? {}).length > 0 ? 2 : 0) +
    (c.open_night ? 1 : 0) +
    (c.open_sunday || c.open_holiday ? 1 : 0)

  return all
    .filter((c) => c.id !== clinic.id)
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, "ko"))
    .slice(0, limit)
}

/** 등록된 치과 총 개수 (사이트맵 분할 계산용) */
export async function getClinicCount(): Promise<number> {
  const { count, error } = await supabase
    .from("implant_lists")
    .select("*", { count: "exact", head: true })

  if (error) throw error
  return count ?? 0
}

/** 사이트맵용 슬러그 묶음. id 순으로 offset/limit 구간만 받아온다. */
export async function getClinicSlugRange(
  offset: number,
  limit: number
): Promise<string[]> {
  const duplicated = await getDuplicateNameKeys()
  const slugs: string[] = []

  for (let taken = 0; taken < limit; taken += PAGE_SIZE) {
    const from = offset + taken
    const to = Math.min(from + PAGE_SIZE, offset + limit) - 1

    const { data, error } = await supabase
      .from("implant_lists")
      .select("id, sigungu, name")
      .order("id")
      .range(from, to)

    if (error) throw error
    const rows = (data ?? []) as Pick<Clinic, "id" | "sigungu" | "name">[]
    slugs.push(
      ...rows.map((c) =>
        buildClinicSlug(c, duplicated.has(dupKey(c.sigungu, c.name)))
      )
    )
    if (rows.length < to - from + 1) break
  }

  return slugs
}

/**
 * 슬러그로 치과 한 곳을 찾는다.
 *
 * 치과명에 하이픈·공백이 섞일 수 있어 슬러그를 되파싱하지 않고,
 * 시군구 후보(긴 것 우선)로 좁힌 뒤 같은 규칙으로 만든 슬러그를 비교한다.
 */
export async function getClinicBySlug(
  slug: string
): Promise<ClinicWithSlug | null> {
  const pairs = await getAllSigunguPairs()
  const candidates = [...new Set(pairs.map((p) => p.sigungu))]
    .filter((sigungu) => slugStartsWithSigungu(slug, sigungu))
    // '성남시 분당구'가 '성남시'보다 먼저 걸리도록 긴 이름부터
    .sort((a, b) => b.length - a.length)

  for (const sigungu of candidates) {
    const clinics = await getClinicsBySigunguName(sigungu)
    const hit = clinics.find((c) => c.slug === slug)
    if (hit) return hit
  }
  return null
}

/** 모든 시도/시군구 조합 (정적 경로 생성용) */
export const getAllSigunguPairs = cache(
  async (): Promise<{ sido: string; sigungu: string }[]> => {
    const { data, error } = await supabase
      .from("implant_sigungu_counts")
      .select("sido, sigungu")

    if (error) throw error
    return (data ?? []) as { sido: string; sigungu: string }[]
  }
)

/** 야간·일요일·공휴일 진료 필터 종류 */
export const OPEN_FEATURES = {
  night: { column: "open_night", countColumn: "night_cnt" },
  sunday: { column: "open_sunday", countColumn: "sunday_cnt" },
  holiday: { column: "open_holiday", countColumn: "holiday_cnt" },
} as const

export type OpenFeature = keyof typeof OPEN_FEATURES

/** 해당 조건으로 진료하는 치과가 있는 시군구만, 많은 순으로 (시도별 그룹) */
export async function getFeatureCountsBySido(
  feature: OpenFeature
): Promise<SidoGroup[]> {
  const { countColumn } = OPEN_FEATURES[feature]
  const groups = await getSigunguCountsBySido()

  return groups
    .map((group) => {
      const items = group.items
        .filter((item) => item[countColumn] > 0)
        .sort(
          (a, b) =>
            b[countColumn] - a[countColumn] ||
            a.sigungu.localeCompare(b.sigungu, "ko")
        )
      return {
        sido: group.sido,
        total: items.reduce((sum, item) => sum + item[countColumn], 0),
        items,
      }
    })
    .filter((group) => group.items.length > 0)
}

/**
 * 야간·토요일·일요일·공휴일을 모두 진료하는 곳 (전국 161곳 내외).
 * 진료 접근성이 가장 넓은 집합이라 추천 페이지의 근거로 쓴다.
 */
export async function getAlwaysOpenClinics(): Promise<ClinicWithSlug[]> {
  const { data, error } = await supabase
    .from("implant_lists")
    .select(CLINIC_COLUMNS)
    .eq("open_night", true)
    .eq("open_saturday", true)
    .eq("open_sunday", true)
    .eq("open_holiday", true)
    .order("sido")
    .order("sigungu")
    .order("name")
    .limit(1000)

  if (error) throw error
  return withSlugs((data ?? []) as Clinic[])
}

/** 토·일 모두 진료하는 곳의 수 (요약 숫자로만 쓴다) */
export async function getWeekendClinicCount(): Promise<number> {
  const { count, error } = await supabase
    .from("implant_lists")
    .select("*", { count: "exact", head: true })
    .eq("open_saturday", true)
    .eq("open_sunday", true)

  if (error) throw error
  return count ?? 0
}

/** 읍면동 구간 수 (집계 뷰의 행 수만 세므로 본문은 받지 않는다) */
export async function getDongCount(): Promise<number> {
  const { count, error } = await supabase
    .from("implant_dong_counts")
    .select("*", { count: "exact", head: true })

  if (error) throw error
  return count ?? 0
}

/** 시군구 집계를 시도별로 묶어서 반환 (시도는 관례 순, 시군구는 개수 많은 순) */
export async function getSigunguCountsBySido(): Promise<SidoGroup[]> {
  const { data, error } = await supabase
    .from("implant_sigungu_counts")
    .select("sido, sigungu, cnt, sunday_cnt, holiday_cnt, night_cnt")

  if (error) throw error

  const groups = new Map<string, SigunguCount[]>()
  for (const row of (data ?? []) as SigunguCount[]) {
    const list = groups.get(row.sido)
    if (list) list.push(row)
    else groups.set(row.sido, [row])
  }

  return [...groups.entries()]
    .map(([sido, items]) => ({
      sido,
      total: items.reduce((sum, r) => sum + r.cnt, 0),
      items: items.sort(
        (a, b) => b.cnt - a.cnt || a.sigungu.localeCompare(b.sigungu, "ko")
      ),
    }))
    .sort((a, b) => {
      const ai = SIDO_ORDER.indexOf(a.sido)
      const bi = SIDO_ORDER.indexOf(b.sido)
      return (
        (ai === -1 ? SIDO_ORDER.length : ai) -
        (bi === -1 ? SIDO_ORDER.length : bi)
      )
    })
}
