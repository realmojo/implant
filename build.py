#!/usr/bin/env python3
"""지역 트리 전수 수집 + 상세 병합.

핵심: 사이트의 상세 페이지는 '병원명'만으로 키가 잡혀 있어(임플란트치과-상세-{이름}.html)
동명 병원 여러 곳이 상세 URL 하나를 공유한다. 따라서 실제 병원 레코드는 지역 페이지 기준이며,
상세(전화/진료시간)는 주소가 일치할 때만 신뢰해서 붙인다.
"""
import html, json, re, threading, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = "https://implant.playecofriendz.com/"
WORKERS = 12
DAYS = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일", "공휴일"]

SIDO_SPLIT = re.compile(r'<h2 class="sido">(.*?)</h2>', re.S)
GU_LINK = re.compile(r'href="(임플란트치과-지역-.*?\.html)"><b>(.*?)</b><span>(\d+)곳</span>')
DONG_SPLIT = re.compile(r'<h2 class="sec" id="d-(.*?)">')
CARD = re.compile(r'<div class="pc"><div class="nm">(.*?)</div>'
                  r'<div class="meta">(.*?)</div>'
                  r'<div class="act"><a href="(.*?)"', re.S)
TAG = re.compile(r'<span class="tag[^"]*">(.*?)</span>')
H1 = re.compile(r"<h1>(.*?)</h1>", re.S)
ROW = re.compile(r'<div class="row"><span class="lb">(.*?)</span><span>(.*?)</span></div>', re.S)
KV = re.compile(r"<tr><th>(.*?)</th><td>(.*?)</td></tr>", re.S)
NAVER = re.compile(r'href="(https://map\.naver\.com/[^"]*)"')

lock, done = threading.Lock(), [0]


def sq(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s)).replace("\xa0", " ")).strip()


def flip_urls(url):
    p = urllib.parse.unquote(url[len(BASE):])
    return [BASE + urllib.parse.quote(p[:i] + c.swapcase() + p[i + 1:])
            for i, c in enumerate(p) if c.isascii() and c.isalpha()]


def fetch(url, tries=3, flip=True):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code == 404 and flip:
                for c in flip_urls(url):
                    d = fetch(c, tries=1, flip=False)
                    if d:
                        return d
                return None
            if i == tries - 1:
                return None
            time.sleep(0.4 * (i + 1))
        except Exception:
            if i == tries - 1:
                return None
            time.sleep(0.4 * (i + 1))


def regions():
    parts = SIDO_SPLIT.split(fetch(BASE + urllib.parse.quote("임플란트치과-지역.html")))
    out = []
    for i in range(1, len(parts), 2):
        sido = sq(parts[i])
        for href, gu, c in GU_LINK.findall(parts[i + 1]):
            out.append({"sido": sido, "sigungu": sq(gu), "count": int(c),
                        "url": BASE + urllib.parse.quote(html.unescape(href))})
    return out


def scrape_region(reg):
    doc = fetch(reg["url"]) or ""
    secs = DONG_SPLIT.split(doc)
    out = []
    for i in range(1, len(secs), 2):
        dong = sq(secs[i])
        for nm, meta, href in CARD.findall(secs[i + 1]):
            out.append({"sido": reg["sido"], "sigungu": reg["sigungu"], "dong": dong,
                        "name": sq(TAG.sub("", nm)), "tags": [sq(t) for t in TAG.findall(nm)],
                        "address": sq(meta),
                        "detail_url": BASE + urllib.parse.quote(html.unescape(href))})
    return out


def scrape_detail(url):
    doc = fetch(url)
    d = {"url": url, "name": "", "address": "", "phone": "", "category": "",
         "hours": {}, "naver_map": "", "ok": bool(doc)}
    if doc:
        m = H1.search(doc)
        if m:
            d["name"] = sq(m.group(1))
        for lb, val in ROW.findall(doc):
            k = sq(lb)
            if k == "주소":
                d["address"] = sq(val)
            elif k == "전화":
                d["phone"] = sq(val)
            elif k == "종별":
                d["category"] = sq(val)
            elif k == "진료시간":
                for day, hrs in KV.findall(val):
                    if sq(day) in DAYS:
                        d["hours"][sq(day)] = sq(hrs)
        m = NAVER.search(doc)
        if m:
            d["naver_map"] = html.unescape(m.group(1))
    with lock:
        done[0] += 1
        if done[0] % 2000 == 0:
            print(f"  상세 {done[0]}건", flush=True)
    return d


t0 = time.time()
regs = regions()
print(f"[1/3] 지역 {len(regs)}개 · 사이트 집계 {sum(r['count'] for r in regs)}곳", flush=True)

with ThreadPoolExecutor(WORKERS) as ex:
    chunks = list(ex.map(scrape_region, regs))
bad = [(r["sido"], r["sigungu"], len(c), r["count"]) for r, c in zip(regs, chunks) if len(c) != r["count"]]
records = [x for c in chunks for x in c]
print(f"  지역 카드 {len(records)}건 · 집계 불일치 지역 {len(bad)}개", flush=True)

# (시도,시군구,동,이름,주소) 기준 중복 제거 — 같은 지역 페이지 내 완전 중복만 제거
uniq, seen = [], set()
for r in records:
    k = (r["sido"], r["sigungu"], r["dong"], r["name"], r["address"])
    if k not in seen:
        seen.add(k)
        uniq.append(r)
print(f"[2/3] 고유 레코드 {len(uniq)}건 (제거 {len(records)-len(uniq)})", flush=True)

urls = sorted({r["detail_url"] for r in uniq})
print(f"  상세 페이지 {len(urls)}개 수집…", flush=True)
with ThreadPoolExecutor(WORKERS) as ex:
    details = {d["url"]: d for d in ex.map(scrape_detail, urls)}

matched = 0
for r in uniq:
    d = details.get(r["detail_url"])
    same = bool(d and d["ok"] and d["address"] == r["address"])
    r["detail_matched"] = same
    r["phone"] = d["phone"] if same else ""
    r["category"] = d["category"] if same else ""
    r["hours"] = d["hours"] if same else {}
    r["naver_map"] = d["naver_map"] if same else ""
    matched += same

json.dump(uniq, open("clinics.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"[3/3] 완료 {len(uniq)}건 · 상세매칭 {matched} ({matched/len(uniq)*100:.1f}%) · {time.time()-t0:.0f}s")
if bad:
    print("  불일치 지역 샘플:", bad[:5])
