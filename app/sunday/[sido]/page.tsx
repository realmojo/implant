import type { Metadata } from "next"

import { FeaturePage } from "@/components/feature-page"
import { getFeatureCountsBySido } from "@/lib/supabase"

export const revalidate = 3600

type Params = { sido: string }

/** 한글 세그먼트는 퍼센트 인코딩된 채로 전달되므로 디코딩해서 쓴다. */
function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export async function generateStaticParams(): Promise<Params[]> {
  const groups = await getFeatureCountsBySido("sunday")
  return groups.map((group) => ({ sido: group.sido }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const sido = decodeSegment((await params).sido)

  return {
    title: `${sido} 일요일 진료 임플란트치과`,
    description: `${sido}에서 일요일에 진료하는 임플란트치과를 시군구별로 찾아보세요.`,
  }
}

export default async function SundaySidoPage({
  params,
}: {
  params: Promise<Params>
}) {
  const sido = decodeSegment((await params).sido)
  return <FeaturePage feature="sunday" sido={sido} />
}
