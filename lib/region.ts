/**
 * 검색어 대응용 지역명 변형.
 *
 * 사람들은 "영등포구 임플란트"보다 "영등포 임플란트"로,
 * "해운대구 임플란트 치과"보다 "해운대 임플란트"로 검색한다.
 * 제목·본문에 짧은 형태를 함께 노출하려고 쓴다.
 */

/** 시도 짧은 이름: 서울특별시 → 서울, 경기도 → 경기 */
export function shortSido(sido: string) {
  const short = sido
    .replace(/특별자치시$|특별자치도$|특별시$|광역시$/, "")
    .replace(/도$/, "")
  return short.length >= 2 ? short : sido
}

/**
 * 시군구 짧은 이름: 영등포구 → 영등포, 성남시 분당구 → 분당, 해운대구 → 해운대
 * 마지막 토큰에서 구/시/군만 떼어낸다.
 */
export function shortSigungu(sigungu: string) {
  const last = sigungu.split(/\s+/).at(-1) ?? sigungu
  const short = last.replace(/[구시군]$/, "")
  return short.length >= 2 ? short : last
}

/**
 * 법정동의 "N가"를 떼어낸 대표 이름: 문래동3가 → 문래동, 당산동6가 → 당산동.
 *
 * 사람들은 "문래동3가 임플란트"가 아니라 "문래동 임플란트"로 검색한다.
 * 이 값을 URL 세그먼트로 쓰고, 목록은 같은 대표 이름을 가진 동을 모두 모은다.
 */
export function baseDong(dong: string) {
  const base = dong.replace(/\s*\d+가$/, "")
  return base.length >= 2 ? base : dong
}

/** 동 짧은 이름: 문래동 → 문래 (동/읍/면 제거) */
export function shortDong(dong: string) {
  const short = baseDong(dong).replace(/[동읍면]$/, "")
  return short.length >= 2 ? short : dong
}

/**
 * 한 지역 페이지가 노려야 할 검색어들.
 * 예: 문래동 → ["문래동 임플란트 치과", "문래동 임플란트", "문래 임플란트", ...]
 */
export function searchPhrases(full: string, short: string, parent?: string) {
  const names = [...new Set([full, short, parent].filter(Boolean) as string[])]
  return names.flatMap((n) => [`${n} 임플란트 치과`, `${n} 임플란트`])
}
