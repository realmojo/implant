export const SITE_NAME = "임플란트 치과 찾기"

export const SITE_DESCRIPTION =
  "전국 임플란트치과를 지역별로 찾아보세요. 진료시간과 야간·일요일·공휴일 진료 여부, 전화번호를 한 번에 확인할 수 있습니다."

/**
 * 배포 도메인. JSON-LD 의 @id·url 과 canonical 은 절대 URL 이어야 해서 필요하다.
 * 배포 환경에서는 NEXT_PUBLIC_SITE_URL 을 반드시 설정한다.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "")

/**
 * 경로를 절대 URL 로 바꾼다. 한글 경로는 퍼센트 인코딩해서 내보낸다.
 * `#dentist` 같은 프래그먼트는 인코딩 대상에서 떼어낸다 (`%23` 이 되면 안 된다).
 */
export function absoluteUrl(path = "/") {
  const hashAt = path.indexOf("#")
  const pathname = hashAt === -1 ? path : path.slice(0, hashAt)
  const hash = hashAt === -1 ? "" : path.slice(hashAt)

  const encoded = pathname
    .split("/")
    .map((seg) => (seg ? encodeURIComponent(decodeURIComponent(seg)) : seg))
    .join("/")

  return `${SITE_URL}${encoded.startsWith("/") ? "" : "/"}${encoded}${hash}`
}

export function regionPath(sido: string, sigungu: string) {
  return `/regions/${encodeURIComponent(sido)}/${encodeURIComponent(sigungu)}`
}
