/**
 * 네이버 플레이스 리뷰 '통계'를 우리 문장으로 다시 쓴다.
 *
 * 남의 리뷰 문장은 애초에 저장하지 않는다(naver_reviews.py 참고). 여기 들어오는
 * 값은 전부 숫자·범주뿐이고, 아래 함수들은 그 숫자를 근거로 문장을 새로 만든다.
 * 원문을 바꿔 쓰는 것이 아니라 집계에서 문장이 나오는 구조라,
 * 같은 글이 네이버에도 있는 상황 자체가 생기지 않는다.
 *
 * 표시 항목은 방문 경험(대기·예약·응대·시설)으로 한정한다. 치료 결과나
 * 진료비에 대한 언급은 세더라도 노출하지 않는다 — 의료광고로 읽힐 여지를
 * 만들지 않기 위해서다.
 */

export interface PlaceStats {
  place_id: string
  review_total: number
  image_review_count: number
  sampled: number
  wait: Record<string, number>
  reserve: Record<string, number>
  topics: Record<string, number>
  conveniences: string[]
}

export interface WaitBar {
  label: string
  count: number
  pct: number
}

export interface ReviewDigest {
  reviewTotal: number
  sampled: number
  waitBars: WaitBar[]
  conveniences: string[]
  paragraphs: string[]
}

/** 대기 시간 범주는 짧은 순으로 고정한다 (많은 순으로 두면 읽기 어렵다). */
const WAIT_ORDER = [
  "바로 입장",
  "10분 이내",
  "30분 이내",
  "1시간 이내",
  "1시간 이상",
]

/** 노출하는 주제만. pain·price 는 일부러 뺐다 (위 주석 참고). */
const TOPIC_LABELS: Record<string, string> = {
  kind: "친절한 응대",
  explain: "설명·상담",
  wait: "대기 시간",
  clean: "청결·시설",
  parking: "주차",
  revisit: "재방문 의사",
}

/**
 * 이 정도는 있어야 '경향'이라고 말할 수 있다.
 * 리뷰 3건으로 비율을 이야기하면 숫자가 오히려 오해를 만든다.
 */
const MIN_REVIEWS = 5
const MIN_SAMPLED = 3

function sum(counts: Record<string, number>) {
  return Object.values(counts).reduce((a, b) => a + b, 0)
}

function topEntries(counts: Record<string, number>, limit: number) {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}

/** 대기 시간 분포를 짧은 순으로 정렬해 막대로 만든다. */
function buildWaitBars(wait: Record<string, number>): WaitBar[] {
  const total = sum(wait)
  if (total === 0) return []

  return WAIT_ORDER.filter((label) => (wait[label] ?? 0) > 0).map((label) => ({
    label,
    count: wait[label],
    pct: Math.round((wait[label] / total) * 100),
  }))
}

function waitSentence(wait: Record<string, number>) {
  const total = sum(wait)
  if (total < MIN_SAMPLED) return null

  const quick = (wait["바로 입장"] ?? 0) + (wait["10분 이내"] ?? 0)
  const within30 = quick + (wait["30분 이내"] ?? 0)
  const top = topEntries(wait, 1)[0]

  // 'N건 가운데 N건'으로 읽히지 않게 전부인 경우는 따로 쓴다.
  const head =
    within30 === total
      ? `대기 시간이 기록된 리뷰 ${total}건은 모두 30분 이내였고, 그중 ${quick}건은 10분 이내였습니다.`
      : `대기 시간이 기록된 리뷰 ${total}건 가운데 ${within30}건이 30분 이내였고, 그중 ${quick}건은 10분 이내였습니다.`

  const parts = [head]
  if (top) {
    parts.push(`가장 많이 선택된 항목은 '${top[0]}'(${top[1]}건)입니다.`)
  }
  return parts.join(" ")
}

function reserveSentence(reserve: Record<string, number>) {
  const total = sum(reserve)
  if (total < MIN_SAMPLED) return null

  const booked = reserve["예약 후 방문"] ?? 0
  const walkIn = reserve["예약 없이 방문"] ?? 0

  if (booked > 0 && walkIn === 0) {
    return `방문 방식은 기록된 ${total}건 모두 예약 후 방문이었습니다. 방문 전 예약을 잡아두는 편이 좋겠습니다.`
  }
  if (walkIn > 0 && booked === 0) {
    return `방문 방식은 기록된 ${total}건 모두 예약 없이 방문이었습니다.`
  }
  return `방문 방식은 예약 후 방문 ${booked}건, 예약 없이 방문 ${walkIn}건으로 나뉩니다.`
}

function topicSentence(topics: Record<string, number>) {
  const named = Object.entries(topics)
    .filter(([key, count]) => TOPIC_LABELS[key] && count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  if (named.length === 0) return null

  const listed = named
    .map(([key, count]) => `${TOPIC_LABELS[key]}(${count}건)`)
    .join(", ")
  return `리뷰에서 자주 언급된 주제는 ${listed} 순입니다.`
}

/**
 * 상세 페이지에 실을 리뷰 요약. 근거가 얇으면 null 을 돌려주고
 * 페이지에서는 이 섹션 자체를 걸지 않는다.
 */
export function buildReviewDigest(
  stats: PlaceStats | null
): ReviewDigest | null {
  if (!stats) return null
  if (stats.review_total < MIN_REVIEWS || stats.sampled < MIN_SAMPLED)
    return null

  const paragraphs: string[] = []

  const opener = [
    `네이버 플레이스에 등록된 방문자 리뷰는 ${stats.review_total.toLocaleString("ko-KR")}건입니다.`,
  ]
  if (stats.image_review_count > 0) {
    opener.push(
      `이 가운데 사진이 함께 올라온 리뷰가 ${stats.image_review_count.toLocaleString("ko-KR")}건입니다.`
    )
  }
  // 전수가 아니라 표본이라는 점을 분명히 밝힌다.
  opener.push(
    `아래 내용은 최근 리뷰 ${stats.sampled}건에 남은 기록을 집계한 것입니다.`
  )
  paragraphs.push(opener.join(" "))

  const wait = waitSentence(stats.wait)
  const reserve = reserveSentence(stats.reserve)
  if (wait || reserve) {
    paragraphs.push([wait, reserve].filter(Boolean).join(" "))
  }

  const topics = topicSentence(stats.topics)
  if (topics) paragraphs.push(topics)

  // 통계라고 부를 만한 게 없으면 굳이 섹션을 만들지 않는다.
  if (paragraphs.length < 2) return null

  return {
    reviewTotal: stats.review_total,
    sampled: stats.sampled,
    waitBars: buildWaitBars(stats.wait),
    conveniences: stats.conveniences ?? [],
    paragraphs,
  }
}
