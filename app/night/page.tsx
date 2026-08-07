import type { Metadata } from "next"

import { FeaturePage } from "@/components/feature-page"

export const metadata: Metadata = {
  title: "야간 진료 임플란트치과",
  description:
    "저녁 8시 이후까지 진료하는 임플란트치과를 지역별로 찾아보세요. 퇴근 후 방문 가능한 치과 목록입니다.",
}

export const revalidate = 3600

export default function NightPage() {
  return <FeaturePage feature="night" />
}
