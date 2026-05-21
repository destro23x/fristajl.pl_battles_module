#!/usr/bin/env python3
"""
Fetch trending TikTok videos for freestyle/rap hashtags and save to S3.

Optional env vars:
  TIKTOK_MS_TOKEN         — msToken cookie from tiktok.com (DevTools → Application → Cookies).
                            If not set, it is obtained automatically via a headless Playwright
                            visit to tiktok.com (no login required — TikTok assigns it to any visitor).
  TIKTOK_HASHTAGS         — comma-separated hashtags (default: freestyle,freestylerap,fristajl,polskirap)
  TIKTOK_VIDEOS_PER_TAG   — how many videos to fetch per hashtag (default: 30)
  TIKTOK_FYP_COUNT        — target number of unique FYP videos to collect (default: 30)
  TIKTOK_FYP_SCROLLS      — max scroll attempts while collecting FYP videos (default: 120)
  S3_ENDPOINT             — override S3 endpoint (e.g. http://localstack:4566 for dev)

JSON structure in S3 (trending.json):
  {
    "manual": ["url1", ...],   <- admin-managed, never overwritten by this script
    "auto":   ["url2", ...]    <- replaced on every run
  }
"""

import asyncio
import json
import os
import sys

import boto3
from playwright.async_api import async_playwright
from TikTokApi import TikTokApi

HASHTAGS = [
    h.strip()
    for h in os.getenv("TIKTOK_HASHTAGS", "freestyle,freestylerap,fristajl,polskirap").split(",")
    if h.strip()
]
MS_TOKEN         = os.getenv("TIKTOK_MS_TOKEN", "").strip()
VIDEOS_PER_TAG   = int(os.getenv("TIKTOK_VIDEOS_PER_TAG", "30"))
FYP_TARGET_COUNT = int(os.getenv("TIKTOK_FYP_COUNT", "30"))
FYP_SCROLL_COUNT = int(os.getenv("TIKTOK_FYP_SCROLLS", "120"))
S3_ENDPOINT      = os.getenv("S3_ENDPOINT", "").strip() or None
S3_BUCKET        = "fristajl-prod-tiktoks"
S3_KEY           = "trending.json"


# ── S3 helpers ────────────────────────────────────────────────────────────────

def s3_client():
    kwargs = {"region_name": "eu-central-1"}
    if S3_ENDPOINT:
        kwargs.update({
            "endpoint_url": S3_ENDPOINT,
            "aws_access_key_id": "test",
            "aws_secret_access_key": "test",
        })
    return boto3.client("s3", **kwargs)


def load_trending() -> dict:
    try:
        obj = s3_client().get_object(Bucket=S3_BUCKET, Key=S3_KEY)
        data = json.loads(obj["Body"].read())
        if not isinstance(data, dict):
            return {"manual": [], "auto": []}
        data.setdefault("manual", [])
        data.setdefault("auto", [])
        return data
    except Exception:
        return {"manual": [], "auto": []}


def save_trending(data: dict):
    body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
    s3_client().put_object(
        Bucket=S3_BUCKET,
        Key=S3_KEY,
        Body=body,
        ContentType="application/json",
        ServerSideEncryption="AES256",
    )


# ── TikTok fetch ──────────────────────────────────────────────────────────────

async def obtain_ms_token() -> str:
    """Visit tiktok.com anonymously and grab the msToken TikTok assigns automatically."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()
        try:
            await page.goto("https://www.tiktok.com/", wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(2)  # give the anti-bot script time to set the cookie
            cookies = await context.cookies("https://www.tiktok.com")
            token = next((c["value"] for c in cookies if c["name"] == "msToken"), "")
            return token
        finally:
            await browser.close()


async def fetch_hashtag(api: TikTokApi, hashtag: str, count: int) -> list[str]:
    urls: list[str] = []
    try:
        tag = api.hashtag(name=hashtag)
        async for video in tag.videos(count=count):
            url = f"https://www.tiktok.com/@{video.author.username}/video/{video.id}"
            urls.append(url)
    except Exception as exc:
        print(f"[WARN] #{hashtag}: {exc}", flush=True)
    return urls


async def fetch_fyp(ms_token: str = "", target_count: int = 30, max_scrolls: int = 120) -> list[str]:
    """Fetch TikTok FYP URLs by intercepting XHR API responses while scrolling.

    Keeps scrolling until `target_count` unique videos are collected or
    `max_scrolls` is reached (safety cap in case the feed stalls).
    """
    collected: dict[str, str] = {}  # video_id -> author_unique_id

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        if ms_token:
            await context.add_cookies([{
                "name": "msToken",
                "value": ms_token,
                "domain": ".tiktok.com",
                "path": "/",
            }])

        page = await context.new_page()

        async def handle_response(response):
            url = response.url
            if not any(k in url for k in ("/api/", "/recommend/", "/feed")):
                return
            try:
                text = await response.text()
                if '"uniqueId"' not in text:
                    return
                data = json.loads(text)
                items = (
                    data.get("itemList")
                    or data.get("item_list")
                    or data.get("data")
                    or []
                )
                if isinstance(items, list):
                    for item in items:
                        video_id = item.get("id")
                        user = item.get("author", {}).get("uniqueId")
                        if video_id and user:
                            collected[video_id] = user
            except Exception:
                pass

        page.on("response", handle_response)

        try:
            await page.goto("https://www.tiktok.com/", wait_until="domcontentloaded", timeout=30000)
            await page.keyboard.press("Escape")
            await asyncio.sleep(1)

            for i in range(max_scrolls):
                if len(collected) >= target_count:
                    break
                await page.mouse.wheel(0, 1200)
                await page.keyboard.press("ArrowDown")  # nudges TikTok's snap-scroll feed forward
                await asyncio.sleep(1.2)

            await asyncio.sleep(2)
        except Exception as exc:
            print(f"[WARN] FYP page error: {exc}", flush=True)
        finally:
            await browser.close()

    urls = [
        f"https://www.tiktok.com/@{user}/video/{vid}"
        for vid, user in collected.items()
    ]
    return urls


async def main():
    ms_token = MS_TOKEN
    if not ms_token:
        print("[INFO] TIKTOK_MS_TOKEN not set — obtaining one automatically via Playwright...", flush=True)
        try:
            ms_token = await obtain_ms_token()
        except Exception as exc:
            print(f"[WARN] Auto msToken fetch failed: {exc}", flush=True)
        if not ms_token:
            print("[SKIP] Could not obtain an msToken — auto-fetch skipped.", flush=True)
            sys.exit(0)
        print("[INFO] Obtained msToken automatically.", flush=True)

    print(f"[INFO] Fetching hashtags: {', '.join('#' + h for h in HASHTAGS)}", flush=True)
    print(f"[INFO] Videos per tag: {VIDEOS_PER_TAG}", flush=True)

    auto_urls: list[str] = []
    seen: set[str] = set()

    async with TikTokApi() as api:
        await api.create_sessions(
            ms_tokens=[ms_token],
            num_sessions=1,
            sleep_after=3,
            headless=True,
        )

        for hashtag in HASHTAGS:
            print(f"[INFO] Fetching #{hashtag} ...", flush=True)
            videos = await fetch_hashtag(api, hashtag, VIDEOS_PER_TAG)
            print(f"[INFO] #{hashtag}: got {len(videos)} videos", flush=True)
            for url in videos:
                if url not in seen:
                    seen.add(url)
                    auto_urls.append(url)

    # ── FYP fetch (Playwright API interception) ──────────────────────────────
    print(f"[INFO] Fetching FYP via Playwright (target {FYP_TARGET_COUNT} videos, "
          f"up to {FYP_SCROLL_COUNT} scrolls) ...", flush=True)
    try:
        fyp_urls = await fetch_fyp(ms_token, target_count=FYP_TARGET_COUNT, max_scrolls=FYP_SCROLL_COUNT)
        print(f"[INFO] FYP: got {len(fyp_urls)} videos", flush=True)
        for url in fyp_urls:
            if url not in seen:
                seen.add(url)
                auto_urls.append(url)
    except Exception as exc:
        print(f"[WARN] FYP fetch failed: {exc}", flush=True)

    if not auto_urls:
        print("[WARN] No videos fetched — keeping existing auto list unchanged.", flush=True)
        sys.exit(0)

    existing = load_trending()
    existing["auto"] = auto_urls
    save_trending(existing)
    print(f"[OK] Saved {len(auto_urls)} auto-trending videos to S3 "
          f"(manual: {len(existing['manual'])}).", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
