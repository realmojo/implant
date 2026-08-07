import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, ChevronRight, Info, MapPin, Moon, Sun } from "lucide-react"

import { JsonLd } from "@/components/json-ld"
import { RecommendList } from "@/components/recommend-list"
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/jsonld"
import {
  getAlwaysOpenClinics,
  getWeekendClinicCount,
  getSigunguCountsBySido,
} from "@/lib/supabase"

export const metadata: Metadata = {
  title: "임플란트치과 추천",
  description:
    "야간·토요일·일요일·공휴일을 모두 진료하는 임플란트치과를 모았습니다. 진료 접근성 기준으로 고른 목록입니다.",
}

export const revalidate = 3600

export default async function RecommendPage() {
  const [clinics, weekendCount, groups] = await Promise.all([
    getAlwaysOpenClinics(),
    getWeekendClinicCount(),
    getSigunguCountsBySido(),
  ])

  const total = groups.reduce((sum, g) => sum + g.total, 0)
  const ko = (n: number) => n.toLocaleString("ko-KR")

  const shortcuts = [
    {
      icon: Moon,
      href: "/night",
      title: "야간 진료",
      note: "퇴근 후에 들를 수 있는 곳",
    },
    {
      icon: Sun,
      href: "/sunday",
      title: "일요일 진료",
      note: "주말에만 시간이 나는 경우",
    },
    {
      icon: CalendarDays,
      href: "/holiday",
      title: "공휴일 진료",
      note: "연휴에 갑자기 아플 때",
    },
    {
      icon: MapPin,
      href: "/regions",
      title: "지역별로 찾기",
      note: "우리 동네부터 확인",
    },
  ]

  return (
    <main className="min-h-svh bg-muted/30">
      <JsonLd
        data={collectionPageJsonLd({
          path: "/recommend",
          name: "임플란트치과 추천",
          description:
            "야간·주말·공휴일까지 진료하는 임플란트치과를 모아 추천합니다.",
          clinics,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "홈", path: "/" },
          { name: "임플란트치과 추천", path: "/recommend" },
        ])}
      />

      <div className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            임플란트치과 <span className="text-primary">추천</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            전국 {ko(total)}곳 가운데 <strong className="text-foreground">
            야간·토요일·일요일·공휴일을 모두 진료</strong>하는 곳을 모았습니다.
            직장인이나 주말에만 시간이 나는 분이 가장 찾기 어려운 조건입니다.
          </p>

          <dl className="mt-8 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border">
            {[
              { label: "모든 조건 진료", value: clinics.length },
              { label: "주말(토·일) 진료", value: weekendCount },
              { label: "전체 등록", value: total },
            ].map((stat) => (
              <div key={stat.label} className="bg-background px-4 py-4">
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-xl font-bold tracking-tight tabular-nums">
                  {ko(stat.value)}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 flex max-w-2xl items-start gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              등록된 <strong className="text-foreground">진료시간 정보만</strong>{" "}
              기준으로 추린 목록입니다. 치료 실력이나 만족도를 평가한 순위가
              아니며, 실제 진료 여부는 방문 전 전화로 확인해 주세요.
            </span>
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-14 px-4 py-10 sm:px-6">
        <section>
          <div className="border-l-4 border-primary pl-3">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              언제 가도 열려 있는 치과
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              야간 · 토요일 · 일요일 · 공휴일 진료를 모두 하는 {clinics.length}곳
            </p>
          </div>

          <div className="mt-6">
            <RecommendList clinics={clinics} />
          </div>
        </section>

        <section>
          <div className="border-l-4 border-primary pl-3">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              조건 하나만 맞으면 되는 경우
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              조건을 넓히면 선택지가 훨씬 많아집니다
            </p>
          </div>

          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shortcuts.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="group flex h-full flex-col justify-between gap-6 rounded-2xl border border-border bg-background p-5 transition-all outline-none hover:border-primary hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <s.icon className="size-5 text-primary" />
                  <div>
                    <p className="font-semibold transition-colors group-hover:text-primary">
                      {s.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {s.note}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
                      보러 가기
                      <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="border-l-4 border-primary pl-3">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              방문 전 확인할 것
            </h2>
          </div>

          <ol className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
            {[
              {
                title: "전화로 진료 여부 확인",
                body: "여기 표시된 진료시간은 등록 정보 기준입니다. 임시 휴진이나 시간 변경이 있을 수 있어 방문 전 통화가 가장 확실합니다.",
              },
              {
                title: "임플란트 진료를 하는지 확인",
                body: "치과라도 임플란트 시술 여부와 취급 범위는 다를 수 있습니다. 예약 시 함께 물어보세요.",
              },
              {
                title: "비용은 직접 문의",
                body: "임플란트 비용은 사용 재료와 잇몸 상태에 따라 달라집니다. 이 사이트는 비용 정보를 제공하지 않습니다.",
              },
              {
                title: "거리와 재방문 부담 고려",
                body: "임플란트는 여러 번 내원이 필요합니다. 집이나 직장에서 오가기 편한 위치인지 함께 보세요.",
              },
            ].map((item, i) => (
              <li key={item.title} className="flex gap-4 px-5 py-4">
                <span className="mt-0.5 shrink-0 font-mono text-sm text-primary tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  )
}
