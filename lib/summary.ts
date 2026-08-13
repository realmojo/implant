/**
 * 치과 한 곳의 '진료 요약' 문장을 데이터에서 만들어낸다.
 *
 * 상세 페이지 18,964개가 주소·진료시간 표만 갖고 있으면 서로 구별되지 않는다.
 * 여기서는 이미 가진 값(진료시간·야간/주말 여부·지역 집계)만 조합해서
 * 페이지마다 다른 문장을 뽑는다. 새로 지어내는 사실은 하나도 없다.
 *
 * 진료시간이 없는 7,293곳(38.5%)도 지역 맥락 문단은 나오도록 했다.
 * 그 페이지들이 지금 가장 얇다.
 */
import type { Clinic } from "@/lib/supabase"
import { shortSigungu } from "@/lib/region"

const WEEKDAYS = ["월요일", "화요일", "수요일", "목요일", "금요일"] as const

/** 이 치과가 속한 지역의 집계. 문장에 '87곳 중 41곳' 같은 맥락을 넣는 데 쓴다. */
export interface RegionStats {
  sigunguTotal: number
  sigunguNight: number
  sigunguSunday: number
  sigunguHoliday: number
  /** 같은 읍면동의 치과 수 (자기 자신 포함) */
  dongTotal: number
}

export interface SummaryHighlight {
  label: string
  value: string
}

export interface ClinicSummary {
  /** 지표 카드 (값이 확실한 것만) */
  highlights: SummaryHighlight[]
  /** 본문 문단. 최소 1개는 항상 나온다. */
  paragraphs: string[]
}

interface Range {
  open: number
  close: number
}

/** "0930 ~ 1800" → { open: 570, close: 1080 } (분 단위). 형식이 다르면 null. */
function parseRange(value: string | undefined): Range | null {
  if (!value) return null
  const m = value.match(/^\s*(\d{3,4})\s*~\s*(\d{3,4})\s*$/)
  if (!m) return null

  const toMinutes = (raw: string) => {
    const p = raw.padStart(4, "0")
    const h = Number(p.slice(0, 2))
    const min = Number(p.slice(2))
    if (h > 24 || min > 59) return null
    return h * 60 + min
  }

  const open = toMinutes(m[1])
  const close = toMinutes(m[2])
  // 종료가 시작보다 빠른 값은 원본 오류로 보고 버린다.
  if (open === null || close === null || close <= open) return null
  return { open, close }
}

/** 570 → "09:30" */
function toClock(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** 150 → "2시간 30분", 480 → "8시간" */
function toDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

/** 배열에서 가장 자주 나온 값 (동률이면 작은 값) */
function mode(values: number[]): number | null {
  if (values.length === 0) return null
  const counts = new Map<number, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)

  let best = values[0]
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount || (count === bestCount && value < best)) {
      best = value
      bestCount = count
    }
  }
  return best
}

/** "월·화·수" 처럼 요일 이름을 짧게 잇는다. */
function joinDays(days: string[]) {
  return days.map((d) => d.replace("요일", "")).join("·")
}

function ratio(part: number, total: number) {
  if (total <= 0) return null
  return Math.round((part / total) * 100)
}

/**
 * 평일 진료 패턴을 한 문장으로.
 * 요일마다 시간이 다르면 대표값(최빈)을 쓰고 '요일마다 다름'을 덧붙인다.
 */
function weekdaySentence(hours: Record<string, string>) {
  const parsed = WEEKDAYS.map((day) => ({
    day: day as string,
    range: parseRange(hours[day]),
  }))
  const open = parsed.filter((p): p is { day: string; range: Range } =>
    Boolean(p.range)
  )
  if (open.length === 0) return null

  const opens = open.map((p) => p.range.open)
  const closes = open.map((p) => p.range.close)
  const modeOpen = mode(opens)!
  const modeClose = mode(closes)!
  const uniform =
    opens.every((v) => v === modeOpen) && closes.every((v) => v === modeClose)

  const totalMinutes = open.reduce(
    (sum, p) => sum + (p.range.close - p.range.open),
    0
  )
  const dayNames = joinDays(open.map((p) => p.day))
  const span = `${toClock(modeOpen)}–${toClock(modeClose)}`

  const closedDays = parsed
    .filter((p) => !p.range)
    .map((p) => p.day.replace("요일", ""))

  const parts: string[] = []
  // 시각 뒤에 조사를 붙이면 '18:00로/으로'가 갈려서 쉼표로 끊는다.
  const around = uniform ? "" : " 전후"
  parts.push(
    open.length === 5
      ? `평일 ${span}${around}, 주 5일 진료합니다.`
      : `${dayNames}요일 ${span}${around}에 진료합니다.`
  )
  if (!uniform) parts.push("요일에 따라 진료시간이 조금씩 다릅니다.")
  if (closedDays.length > 0 && open.length < 5) {
    parts.push(`${closedDays.join("·")}요일은 진료하지 않습니다.`)
  }
  parts.push(`평일 진료시간은 주당 ${toDuration(totalMinutes)}입니다.`)

  return {
    text: parts.join(" "),
    modeOpen,
    modeClose,
    weekdayMinutes: Math.round(totalMinutes / open.length),
    days: open.length,
  }
}

/** 토·일·공휴일을 평일과 비교해서 설명한다. */
function weekendSentence(
  hours: Record<string, string>,
  clinic: Pick<Clinic, "open_sunday" | "open_holiday">,
  weekdayAverage: number | null
) {
  const parts: string[] = []
  const sat = parseRange(hours["토요일"])

  if (sat) {
    const length = sat.close - sat.open
    const shorter =
      weekdayAverage !== null && length < weekdayAverage - 30
        ? "평일보다 짧게 "
        : ""
    parts.push(
      `토요일은 ${shorter}${toClock(sat.open)}–${toClock(sat.close)}에 진료합니다.`
    )
  } else {
    parts.push("토요일은 진료하지 않습니다.")
  }

  const sun = parseRange(hours["일요일"])
  if (sun) {
    // 토요일이 휴진이면 '일요일도'가 어색해진다.
    const particle = sat ? "일요일도" : "일요일에는"
    parts.push(
      `${particle} ${toClock(sun.open)}–${toClock(sun.close)}에 엽니다.`
    )
  } else if (!clinic.open_sunday) {
    parts.push("일요일은 휴진입니다.")
  }

  const holiday = parseRange(hours["공휴일"])
  if (holiday) {
    parts.push(
      `공휴일에는 ${toClock(holiday.open)}–${toClock(holiday.close)}에 진료합니다.`
    )
  }

  return parts.join(" ")
}

/**
 * 지역 안에서 이 치과가 어디쯤인지. 진료시간 정보가 없는 치과도
 * 이 문단만큼은 만들어진다.
 */
function regionParagraph(
  clinic: Pick<Clinic, "sigungu" | "dong">,
  region: RegionStats,
  dongLabel: string
) {
  const short = shortSigungu(clinic.sigungu)
  const parts: string[] = []

  parts.push(
    `${clinic.sigungu}에 등록된 임플란트 치과는 ${region.sigunguTotal.toLocaleString("ko-KR")}곳이며, 이 가운데 ${dongLabel} 지역에 ${region.dongTotal.toLocaleString("ko-KR")}곳이 있습니다.`
  )

  const nightPct = ratio(region.sigunguNight, region.sigunguTotal)
  if (region.sigunguNight > 0 && nightPct !== null) {
    parts.push(
      `${short}에서 야간 진료를 하는 곳은 ${region.sigunguNight.toLocaleString("ko-KR")}곳(${nightPct}%)입니다.`
    )
  }

  // 0곳인 항목까지 나열하면 '공휴일 진료 0곳'처럼 읽혀서 빼고 쓴다.
  const weekend: string[] = []
  if (region.sigunguSunday > 0) {
    weekend.push(`일요일 ${region.sigunguSunday.toLocaleString("ko-KR")}곳`)
  }
  if (region.sigunguHoliday > 0) {
    weekend.push(`공휴일 ${region.sigunguHoliday.toLocaleString("ko-KR")}곳`)
  }

  if (weekend.length > 0) {
    const pct = ratio(
      Math.max(region.sigunguSunday, region.sigunguHoliday),
      region.sigunguTotal
    )
    const tail = pct !== null && pct <= 15 ? " 정도로 많지 않습니다" : "입니다"
    parts.push(`주말·휴일 진료는 ${weekend.join(", ")}${tail}.`)
  } else if (region.sigunguTotal > 0) {
    parts.push(
      `${short}에는 일요일이나 공휴일에 진료하는 임플란트 치과가 등록되어 있지 않습니다.`
    )
  }

  return parts.join(" ")
}

/** 이 치과가 지역에서 드문 조건을 갖췄는지 짚어준다. */
function standoutParagraph(
  clinic: Pick<
    Clinic,
    "open_night" | "open_sunday" | "open_holiday" | "sigungu"
  >,
  region: RegionStats
) {
  const short = shortSigungu(clinic.sigungu)
  const notes: string[] = []

  if (clinic.open_night && region.sigunguNight > 0) {
    const pct = ratio(region.sigunguNight, region.sigunguTotal)
    notes.push(
      `평일 저녁 8시 이후까지 진료해, ${short}에서 야간 진료가 가능한 ${region.sigunguNight.toLocaleString("ko-KR")}곳${pct !== null ? `(전체의 ${pct}%)` : ""}에 속합니다`
    )
  }
  if (clinic.open_sunday && region.sigunguSunday > 0) {
    // 그 지역에 한 곳뿐이면 'N곳 중 한 곳'이 어색해진다.
    notes.push(
      region.sigunguSunday === 1
        ? `${short}에서 일요일에 문을 여는 유일한 임플란트 치과입니다`
        : `일요일에도 문을 여는 ${short} ${region.sigunguSunday.toLocaleString("ko-KR")}곳 중 한 곳입니다`
    )
  }
  if (clinic.open_holiday && region.sigunguHoliday > 0) {
    notes.push(
      `공휴일 진료가 가능한 ${region.sigunguHoliday.toLocaleString("ko-KR")}곳에도 포함됩니다`
    )
  }

  if (notes.length === 0) return null
  return `${notes.join(", ")}.`
}

/**
 * 상세 페이지에 실을 요약을 만든다.
 * 사실이 부족하면 문단 수가 줄어들 뿐, 없는 말을 채우지 않는다.
 */
export function buildClinicSummary(
  clinic: Clinic,
  region: RegionStats,
  dongLabel: string
): ClinicSummary {
  const hours = clinic.hours ?? {}
  const weekday = weekdaySentence(hours)
  const paragraphs: string[] = []
  const highlights: SummaryHighlight[] = []

  if (weekday) {
    paragraphs.push(
      `${weekday.text} ${weekendSentence(hours, clinic, weekday.weekdayMinutes)}`
    )
    highlights.push(
      { label: "평일 진료", value: `주 ${weekday.days}일` },
      {
        label: "대표 진료시간",
        value: `${toClock(weekday.modeOpen)}–${toClock(weekday.modeClose)}`,
      },
      { label: "하루 평균", value: toDuration(weekday.weekdayMinutes) }
    )
  } else {
    paragraphs.push(
      `${clinic.name}의 진료시간은 공개된 자료에 포함되어 있지 않습니다. 방문 전 전화로 확인하시는 편이 확실합니다.`
    )
  }

  const standout = standoutParagraph(clinic, region)
  if (standout) paragraphs.push(standout)

  paragraphs.push(regionParagraph(clinic, region, dongLabel))

  highlights.push({
    label: `${dongLabel} 임플란트 치과`,
    value: `${region.dongTotal.toLocaleString("ko-KR")}곳`,
  })

  return { highlights, paragraphs }
}
