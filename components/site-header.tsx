"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

import { cn } from "@/lib/utils"

export const navItems = [
  { label: "지역별 임플란트치과", href: "/regions" },
  { label: "임플란트치과 추천", href: "/recommend" },
  { label: "야간 진료", href: "/night" },
  { label: "공휴일 진료", href: "/holiday" },
  { label: "일요일 진료", href: "/sunday" },
  { label: "정보 가이드", href: "/guide" },
]

function ToothMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 3.2c-1.6 0-2.3.7-3.9.7-1.9 0-3.6 1.3-3.6 3.9 0 2.3.7 3.4 1.3 5.4.4 1.3.6 2.6.8 4.1.2 1.5.6 3.5 1.8 3.5 1.3 0 1.4-1.7 1.7-3.6.2-1.4.6-2.5 1.9-2.5s1.7 1.1 1.9 2.5c.3 1.9.4 3.6 1.7 3.6 1.2 0 1.6-2 1.8-3.5.2-1.5.4-2.8.8-4.1.6-2 1.3-3.1 1.3-5.4 0-2.6-1.7-3.9-3.6-3.9-1.6 0-2.3-.7-3.9-.7Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          onClick={() => setOpen(false)}
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ToothMark className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            임플란트 치과 찾기
          </span>
        </Link>

        <nav aria-label="주요 메뉴" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      active
                        ? "text-primary"
                        : "text-foreground/75 hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <button
          type="button"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
          className="flex size-9 items-center justify-center rounded-md text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="모바일 메뉴"
          className="border-t border-border bg-background lg:hidden"
        >
          <ul className="mx-auto flex w-full max-w-6xl flex-col px-4 py-2 sm:px-6">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-md px-2 py-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      active ? "text-primary" : "text-foreground hover:bg-muted"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  )
}
