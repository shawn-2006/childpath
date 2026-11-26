#!/usr/bin/env python3
"""
問路鈴｜OneKindKnock 資料驗證與同步腳本
用途：每次更新 data/services.min.json（或從外部 JSON 匯入）後執行，
      自動檢查必填欄位、去重統計、更新 generated_at，並同步產生 data/offline.js。
用法：python3 scripts/build_data.py
"""
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "data" / "services.min.json"
OFFLINE_PATH = ROOT / "data" / "offline.js"

REQUIRED_KEYS = {"id", "name", "county", "category", "age_status", "services_summary"}


def main() -> None:
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    items = data.get("items", [])

    seen_ids = set()
    clean_items = []
    for idx, it in enumerate(items):
        missing = [k for k in REQUIRED_KEYS if not it.get(k)]
        if missing:
            raise SystemExit(f"第 {idx+1} 筆資料缺少必填欄位 {missing}: {it.get('name')}")
        if it["id"] in seen_ids:
            raise SystemExit(f"發現重複 ID: {it['id']}")
        seen_ids.add(it["id"])
        clean_items.append(it)

    today = datetime.now(ZoneInfo("Asia/Taipei")).strftime("%Y-%m-%d")
    data["generated_at"] = today
    data["count"] = len(clean_items)
    data["items"] = clean_items

    JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    OFFLINE_PATH.write_text(
        "// Local file preview, generated from services.min.json. Hosted pages load the JSON directly.\n"
        "window.childPathOfflineData = "
        + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(f"OK: {len(clean_items)} 筆資料驗證通過，已更新 {JSON_PATH.name} 與 {OFFLINE_PATH.name}（基準日 {today}）。")


if __name__ == "__main__":
    main()
