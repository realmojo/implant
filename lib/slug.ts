/**
 * URL 슬러그 규칙: `{시군구}-{치과명}` (예: 강남구-미래의료재단미래치과의원)
 *
 * (시군구, 치과명) 조합이 전국에 2곳 이상 존재하는 128개 조합만 뒤에 id를 붙여
 * 구분한다. 나머지 98.6%는 시군구-이름 그대로다.
 */

/** 한글·영문·숫자만 남기고 공백은 하이픈으로. */
export function slugifyPart(part: string) {
  return part
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** 중복 판별 키 (`시군구|치과명`) */
export function dupKey(sigungu: string, name: string) {
  return `${sigungu}|${name}`
}

export function buildClinicSlug(
  clinic: { id: number; sigungu: string; name: string },
  duplicated: boolean
) {
  const base = `${slugifyPart(clinic.sigungu)}-${slugifyPart(clinic.name)}`
  return duplicated ? `${base}-${clinic.id}` : base
}

/** 슬러그가 이 시군구로 시작하는지 (가장 긴 것부터 확인하기 위한 후보 판별) */
export function slugStartsWithSigungu(slug: string, sigungu: string) {
  const prefix = slugifyPart(sigungu)
  return slug === prefix || slug.startsWith(`${prefix}-`)
}
