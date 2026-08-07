import type { Metadata } from "next"

import { FeaturePage } from "@/components/feature-page"

export const metadata: Metadata = {
  title: "일요일 진료 임플란트치과",
  description:
    "일요일에 진료하는 임플란트치과를 지역별로 찾아보세요. 주말 진료 가능한 치과 목록입니다.",
}

export const revalidate = 3600

export default function SundayPage() {
  return <FeaturePage feature="sunday" />
}
