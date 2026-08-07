/**
 * 애드센스 설정.
 *
 * "use client" 모듈에서 export 한 상수는 서버 컴포넌트에서 클라이언트 참조로
 * 바뀌어 값이 undefined 가 된다. 그래서 슬롯 번호는 여기 따로 둔다.
 */
export const AD_CLIENT = "ca-pub-9130836798889522"

/** 치과 상세 페이지 광고 슬롯 */
export const AD_SLOTS = {
  /** 최상단 — 제목 위 */
  top: "3491817124",
  /** 중간 — 전화번호 아래 */
  middle: "3977354127",
  /** 하단 — 태그 아래 */
  bottom: "2178735457",
} as const
