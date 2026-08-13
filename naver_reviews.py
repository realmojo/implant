#!/usr/bin/env python3
"""네이버 플레이스 → 치과별 리뷰 '통계' 수집기.

원문을 그대로 쓰지 않는다. 수집 단계에서 이미 다음 형태로만 남긴다.

  - visitCategories(예약 여부·대기 시간)  → 범주별 카운트
  - 리뷰 본문                             → 자체 사전으로 주제 카운트만 뽑고 본문은 버림
  - conveniences(편의시설)                → 사실 나열
  - visitorReviewsTotal / imageReviewCount

즉 저장되는 것은 숫자뿐이고, 남의 문장은 디스크에 남지 않는다.
이렇게 해야 (1) 저작권 시비가 없고 (2) 네이버 유사문서 필터에 걸리지 않으며
(3) 의료법 56조가 금지하는 '치료경험담' 인용을 구조적으로 피할 수 있다.

요청은 pcmap HTML 2회/치과(검색 → 상세)뿐이다. GraphQL 은 429 가 훨씬 빨리 걸린다.

    python3 naver_reviews.py            # 이어서 수집
    python3 naver_reviews.py --limit 50 # 표본만
"""
import argparse
import gzip
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CLINICS = os.path.join(HERE, "clinics.json")
OUT = os.path.join(HERE, "place_stats.jsonl")

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

# 1.5초 간격은 실측으로 안정적이었다. 429 가 나면 스스로 더 느려진다.
BASE_DELAY = 1.5
MAX_DELAY = 60.0

# 리뷰 본문에서 뽑는 주제. 값은 (표시명, 정규식).
# 본문을 저장하지 않기 위해 여기서 카운트로 환원한다.
TOPICS = {
    "kind": ("친절한 응대", r"친절|상냥|배려|편안|따뜻|웃"),
    "explain": ("설명·상담", r"설명|상담|자세히|꼼꼼|이해|알려주"),
    "wait": ("대기 시간", r"대기|기다리|기다렸|빨리|신속|오래 걸"),
    "clean": ("청결·시설", r"깨끗|청결|위생|시설|쾌적|최신"),
    "pain": ("통증 관리", r"안 ?아프|아프지 ?않|통증|무통|아팠"),
    "price": ("비용 안내", r"가격|비용|저렴|합리적|비싸|見적|견적"),
    "parking": ("주차", r"주차"),
    "revisit": ("재방문 의사", r"또 오|재방문|계속 다|단골|추천"),
}
TOPIC_RE = {k: re.compile(v[1]) for k, v in TOPICS.items()}

# 대기 시간 범주 코드 → 표시명 (네이버가 코드에 공백을 흘리는 경우가 있어 정규화한다)
WAIT_LABELS = {
    "v_enter_immediately": "바로 입장",
    "v_within_10minutes": "10분 이내",
    "v_within_30minutes": "30분 이내",
    "v_within_1hour": "1시간 이내",
    "v_over_1hour": "1시간 이상",
}
RESERVE_LABELS = {
    "v_with_reservation": "예약 후 방문",
    "v_no_reservation": "예약 없이 방문",
}


def http_get(url, tries=4):
    """429/5xx 는 지수 백오프. 실패하면 None."""
    delay = 2.0
    for attempt in range(tries):
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": UA,
                "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
                "Accept-Language": "ko-KR,ko;q=0.9",
                "Referer": "https://map.naver.com/",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                raw = r.read()
                if r.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.decompress(raw)
                return raw.decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code in (429, 500, 502, 503) and attempt < tries - 1:
                time.sleep(delay + random.random())
                delay = min(delay * 2, MAX_DELAY)
                continue
            return None
        except Exception:
            if attempt == tries - 1:
                return None
            time.sleep(delay)
            delay = min(delay * 2, MAX_DELAY)
    return None


def apollo_state(body):
    """페이지에 박힌 window.__APOLLO_STATE__ 를 꺼낸다."""
    if not body:
        return {}
    i = body.find("window.__APOLLO_STATE__")
    if i == -1:
        return {}
    j = body.find("{", i)
    if j == -1:
        return {}
    try:
        return json.JSONDecoder().raw_decode(body[j:])[0]
    except ValueError:
        return {}


def digits(value):
    return re.sub(r"\D", "", value or "")


def addr_tokens(value):
    """주소 비교용 토큰 (번지·층 표기 흔들림을 흡수한다)."""
    return set(re.findall(r"[가-힣0-9]+", (value or "").replace("특별자치도", "").replace("광역시", "")))


def find_place(clinic):
    """검색 결과에서 이 치과로 확신할 수 있는 place 를 고른다.

    쿼리는 '{시군구} {치과명}'. 이름만 쓰면 동명 치과가 전국에서 최대 50건까지
    쏟아지고(예: 중앙치과의원 45건), 주소 전체를 붙이면 오히려 0건이 된다.
    시군구로 좁히면 표본 12곳 중 11곳이 정확히 1건으로 떨어졌다.

    좁힌 뒤에도 전화번호 일치 또는 주소 토큰 겹침으로 한 번 더 확인한다.
    애매하면 버린다 — 엉뚱한 치과의 리뷰를 붙이는 게 최악이다.
    """
    query = f"{clinic['sigungu']} {clinic['name']}"
    url = "https://pcmap.place.naver.com/place/list?" + urllib.parse.urlencode(
        {"query": query}
    )
    state = apollo_state(http_get(url))

    want_phone = digits(clinic.get("phone"))
    want_addr = addr_tokens(clinic["address"])

    candidates = []
    for value in state.values():
        if not isinstance(value, dict):
            continue
        if value.get("__typename") != "PlaceListBusinessesItem":
            continue
        if value.get("name") != clinic["name"]:
            continue
        candidates.append(value)

    best = None
    for value in candidates:
        got_phone = digits(value.get("phone"))
        if want_phone and want_phone == got_phone:
            return value, "phone"
        overlap = len(want_addr & addr_tokens(value.get("fullAddress")))
        if best is None or overlap > best[1]:
            best = (value, overlap)

    if not best:
        return None, None

    value, overlap = best
    # 시군구까지 좁혀서 후보가 하나뿐이면 동 이름 정도만 겹쳐도 같은 곳으로 본다.
    if len(candidates) == 1 and overlap >= 2:
        return value, "region"
    if overlap >= 4:
        return value, "address"
    return None, None


def collect_reviews(place_id):
    """상세 리뷰 탭 1회 요청으로 리뷰 표본 + 편의시설을 가져온다."""
    url = f"https://pcmap.place.naver.com/hospital/{place_id}/review/visitor"
    state = apollo_state(http_get(url))

    wait, reserve, topics = {}, {}, {}
    sampled = 0
    conveniences, total, image_count = [], 0, 0

    for value in state.values():
        if not isinstance(value, dict):
            continue
        kind = value.get("__typename")

        if kind == "PlaceDetailBase":
            conveniences = value.get("conveniences") or []
            total = value.get("visitorReviewsTotal") or 0

        elif kind == "VisitorReviewStatsResult":
            review = value.get("review") or {}
            image_count = review.get("imageReviewCount") or 0
            total = total or review.get("totalCount") or 0

        elif kind == "VisitorReview":
            sampled += 1
            for cat in value.get("visitCategories") or []:
                code = cat.get("code")
                if code in WAIT_LABELS:
                    label = WAIT_LABELS[code]
                    wait[label] = wait.get(label, 0) + 1
                elif code in RESERVE_LABELS:
                    label = RESERVE_LABELS[code]
                    reserve[label] = reserve.get(label, 0) + 1

            # 본문은 여기서만 쓰고 버린다. 저장되는 건 주제 카운트뿐.
            body = value.get("body") or ""
            for key, pattern in TOPIC_RE.items():
                if pattern.search(body):
                    topics[key] = topics.get(key, 0) + 1

    return {
        "review_total": total,
        "image_review_count": image_count,
        "sampled": sampled,
        "conveniences": conveniences,
        "wait": wait,
        "reserve": reserve,
        "topics": topics,
    }


def load_done(path):
    """이미 처리한 치과 키. 중간에 끊겨도 이어서 돌린다."""
    done = set()
    if not os.path.exists(path):
        return done
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                done.add(json.loads(line)["key"])
            except (ValueError, KeyError):
                continue
    return done


def clinic_key(clinic):
    return f"{clinic['name']}|{clinic['address']}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="처리할 최대 건수 (0=전체)")
    ap.add_argument("--delay", type=float, default=BASE_DELAY)
    ap.add_argument("--out", default=OUT)
    args = ap.parse_args()

    clinics = json.load(open(CLINICS, encoding="utf-8"))
    done = load_done(args.out)
    todo = [c for c in clinics if clinic_key(c) not in done]
    if args.limit:
        todo = todo[: args.limit]

    print(f"전체 {len(clinics)} · 완료 {len(done)} · 이번 대상 {len(todo)}", flush=True)

    t0 = time.time()
    matched = 0
    with open(args.out, "a", encoding="utf-8") as out:
        for i, clinic in enumerate(todo, 1):
            place, how = find_place(clinic)
            time.sleep(args.delay + random.random() * 0.5)

            record = {
                "key": clinic_key(clinic),
                "name": clinic["name"],
                "address": clinic["address"],
                "place_id": None,
                "match": None,
            }

            if place:
                matched += 1
                record["place_id"] = place.get("id")
                record["match"] = how
                record["booking_url"] = place.get("bookingUrl")
                record["stats"] = collect_reviews(place["id"])
                time.sleep(args.delay + random.random() * 0.5)

            out.write(json.dumps(record, ensure_ascii=False) + "\n")
            out.flush()

            if i % 25 == 0 or i == len(todo):
                rate = i / max(time.time() - t0, 1)
                left = (len(todo) - i) / max(rate, 1e-6) / 3600
                print(
                    f"  {i}/{len(todo)} · 매칭 {matched} ({matched / i * 100:.0f}%) "
                    f"· {rate * 3600:.0f}건/h · 남은시간 {left:.1f}h",
                    flush=True,
                )

    print(f"완료 {len(todo)}건 · {time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    sys.exit(main())
