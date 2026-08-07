import type { Metadata } from "next"

import { FeaturePage } from "@/components/feature-page"

export const metadata: Metadata = {
  title: "공휴일 진료 임플란트치과",
  description:
    "공휴일에도 문을 여는 임플란트치과를 지역별로 찾아보세요. 진료시간과 전화번호를 함께 확인할 수 있습니다.",
}

export const revalidate = 3600

export default function HolidayPage() {
  return <FeaturePage feature="holiday" />
}
