#!/usr/bin/env python3
"""clinics.json → Supabase implant_lists 벌크 적재 (PostgREST)."""
import json, re, sys, time, urllib.request

ENV = "/Users/realmojo/Desktop/m/clipseo/.env.local"
WEEK = ["월요일", "화요일", "수요일", "목요일", "금요일"]
BATCH = 500


def read_env(path):
    out = {}
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


env = read_env(ENV)
URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = env["NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"]
assert "muefmsmbfhdgcokjzlcd" in URL, f"예상과 다른 프로젝트: {URL}"


def is_night(hours):
    for d in WEEK:
        m = re.match(r"^\s*(\d{3,4})\s*~\s*(\d{3,4})\s*$", hours.get(d, ""))
        if m and int(m.group(2)) >= 2000:
            return True
    return False


rows = json.load(open("clinics.json", encoding="utf-8"))
payload = [{
    "name": r["name"], "address": r["address"],
    "phone": r["phone"] or None, "category": r["category"] or None,
    "sido": r["sido"], "sigungu": r["sigungu"], "dong": r["dong"],
    "hours": r["hours"], "tags": r["tags"],
    "open_night": is_night(r["hours"]),
    "detail_url": r["detail_url"], "naver_map_url": r["naver_map"] or None,
    "has_detail": r["detail_matched"],
} for r in rows]

endpoint = f"{URL}/rest/v1/implant_lists?on_conflict=name,address"
headers = {
    "apikey": KEY, "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=minimal",
}

t0, sent = time.time(), 0
for i in range(0, len(payload), BATCH):
    chunk = payload[i:i + BATCH]
    body = json.dumps(chunk, ensure_ascii=False).encode()
    req = urllib.request.Request(endpoint, data=body, headers=headers, method="POST")
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                r.read()
            sent += len(chunk)
            break
        except urllib.error.HTTPError as e:
            print(f"  batch {i//BATCH}: HTTP {e.code} {e.read().decode()[:400]}", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            if attempt == 2:
                print(f"  batch {i//BATCH} 실패: {e}", file=sys.stderr)
                sys.exit(1)
            time.sleep(2)
    if sent % 5000 == 0 or sent == len(payload):
        print(f"  {sent}/{len(payload)}", flush=True)

print(f"적재 완료 {sent}건 · {time.time()-t0:.0f}s")
