#!/usr/bin/env python3
"""place_stats.jsonl → Supabase implant_place_stats 적재.

수집기가 이미 통계로 환원해 둔 값을 그대로 올린다. 리뷰 원문은 애초에
파일에 없으므로 여기서도 다룰 것이 없다.

치과 식별은 (name, address) — implant_lists 의 유니크 키와 같다.
그 키로 clinic_id 를 찾아 넣는다.

    python3 load_reviews.py
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
STATS = os.path.join(HERE, "place_stats.jsonl")

# 서비스 롤 키는 이 저장소에 없다. load.py 와 같은 위치를 쓴다.
ENV = "/Users/realmojo/Desktop/m/clipseo/.env.local"
BATCH = 500
PAGE = 1000


def read_env(path):
    out = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip().strip('"').strip("'")
    return out


env = read_env(ENV)
URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = env["NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"]
assert "muefmsmbfhdgcokjzlcd" in URL, f"예상과 다른 프로젝트: {URL}"

HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
}


def request(method, path, body=None, headers=None):
    h = dict(HEADERS)
    if headers:
        h.update(headers)
    data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
    req = urllib.request.Request(f"{URL}{path}", data=data, headers=h, method=method)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                raw = r.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            print(f"  HTTP {e.code}: {e.read().decode()[:400]}", file=sys.stderr)
            raise
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2)


def clinic_id_map():
    """(name, address) → id. PostgREST 는 한 번에 1000행까지만 준다."""
    mapping = {}
    for start in range(0, 100_000, PAGE):
        rows = request(
            "GET",
            "/rest/v1/implant_lists?select=id,name,address&order=id"
            f"&offset={start}&limit={PAGE}",
        )
        if not rows:
            break
        for row in rows:
            mapping[f"{row['name']}|{row['address']}"] = row["id"]
        if len(rows) < PAGE:
            break
    return mapping


def main():
    if not os.path.exists(STATS):
        print(f"{STATS} 가 없습니다. 먼저 naver_reviews.py 를 돌리세요.", file=sys.stderr)
        return 1

    print("치과 id 조회 중…", flush=True)
    ids = clinic_id_map()
    print(f"  {len(ids)}건", flush=True)

    payload, skipped, unmatched = [], 0, 0
    with open(STATS, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)

            # 네이버에서 place 를 찾지 못한 치과는 올릴 것이 없다.
            if not record.get("place_id") or not record.get("stats"):
                unmatched += 1
                continue

            clinic_id = ids.get(record["key"])
            if clinic_id is None:
                skipped += 1
                continue

            stats = record["stats"]
            payload.append(
                {
                    "clinic_id": clinic_id,
                    "place_id": record["place_id"],
                    "match_by": record.get("match") or "unknown",
                    "review_total": stats.get("review_total") or 0,
                    "image_review_count": stats.get("image_review_count") or 0,
                    "sampled": stats.get("sampled") or 0,
                    "wait": stats.get("wait") or {},
                    "reserve": stats.get("reserve") or {},
                    "topics": stats.get("topics") or {},
                    "conveniences": stats.get("conveniences") or [],
                }
            )

    print(
        f"적재 대상 {len(payload)}건 · 네이버 미매칭 {unmatched} · id 미발견 {skipped}",
        flush=True,
    )

    sent = 0
    t0 = time.time()
    for i in range(0, len(payload), BATCH):
        chunk = payload[i : i + BATCH]
        request(
            "POST",
            "/rest/v1/implant_place_stats?on_conflict=clinic_id",
            chunk,
            {"Prefer": "resolution=merge-duplicates,return=minimal"},
        )
        sent += len(chunk)
        if sent % 2500 == 0 or sent == len(payload):
            print(f"  {sent}/{len(payload)}", flush=True)

    print(f"완료 {sent}건 · {time.time() - t0:.0f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
