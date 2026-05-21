---
name: tiktok-url-collector
description: 'Collect TikTok video URLs using the browser tools (Playwright). Use when asked to: scrape TikTok links, fetch tiktok video URLs, collect TikToks from hashtag pages or the main feed (FYP), pobierz linki do tiktoków, zbierz tiktoki.'
---

# TikTok URL Collector

## Overview
Two proven methods for collecting TikTok video URLs using browser tools (open_browser_page, run_playwright_code).

---

## Method 1: Hashtag Pages (Recommended for topic-specific content)

Best for: collecting freestyle, rap, music, or any topic-specific TikToks.

### Steps

1. Open a hashtag page:
```javascript
navigate_page({ url: "https://www.tiktok.com/tag/HASHTAG" })
```

2. Wait for grid to load, then scroll twice and extract links:
```javascript
run_playwright_code({
  code: `
    await page.waitForSelector('a[href*="/video/"]', { timeout: 8000 }).catch(() => {})
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(2000)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(2000)
    return page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/video/"]'))
        .map(a => a.href)
        .filter(h => /tiktok\\.com\\/@[^/]+\\/video\\/\\d+/.test(h))
        .filter((v, i, a) => a.indexOf(v) === i)
    })
  `
})
```

3. Repeat for multiple hashtags and merge/deduplicate:
```python
seen = set()
all_urls = []
for u in list1 + list2 + list3:
    if u not in seen:
        seen.add(u)
        all_urls.append(u)
```

**Yield**: ~80–90 URLs per hashtag page (with 2 scrolls).

---

## Method 2: Main Feed / FYP (https://www.tiktok.com)

Best for: collecting trending/personalized content from the logged-in user's For You Page.

### Key Insight
- The FYP is a full-screen single-video player — URLs do NOT change per video
- Navigation chevron buttons (`.TUXButton-content` with `class="css-12x5cd4"`) exist in DOM but are **hidden (0×0 px)**
- TikTok makes XHR calls to `/api/recommend/item_list/` when loading more videos
- Scrolling with `page.mouse.wheel(0, 800)` advances to next video and triggers these API calls

### Steps

1. Navigate to main TikTok:
```javascript
navigate_page({ url: "https://www.tiktok.com" })
```

2. Dismiss any login dialog (Escape key):
```javascript
run_playwright_code({
  code: `
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  `
})
```

3. Intercept API responses and scroll to collect URLs:
```javascript
run_playwright_code({
  code: `
    const collected = new Map()

    page.on('response', async (response) => {
      const url = response.url()
      if (!url.includes('/api/') && !url.includes('/recommend/')) return
      try {
        const text = await response.text()
        if (!text.includes('"uniqueId"')) return
        const data = JSON.parse(text)
        const items = data.itemList || data.item_list || data.data || []
        if (Array.isArray(items)) {
          items.forEach((item) => {
            const videoId = item.id
            const user = item.author?.uniqueId
            if (videoId && user) collected.set(videoId, user)
          })
        }
      } catch {}
    })

    // Scroll to load more videos (each scroll = next video + API call)
    for (let i = 0; i < 25; i++) {
      await page.mouse.wheel(0, 800)
      await page.waitForTimeout(900)
    }

    await page.waitForTimeout(2000)
    return Array.from(collected.entries())
      .map(e => \`https://www.tiktok.com/@\${e[1]}/video/\${e[0]}\`)
  `,
  timeoutMs: 35000
})
```

**Yield**: ~25–50 URLs per 25 scrolls (depends on API batch sizes).

### Bonus: Initial page data (before any scrolling)
The server-rendered HTML contains initial feed items in a `<script>` tag:
```javascript
run_playwright_code({
  code: `
    return page.evaluate(function() {
      var scripts = Array.from(document.querySelectorAll('script'))
      var results = []
      for (var i = 0; i < scripts.length; i++) {
        var text = scripts[i].textContent || ''
        if (!text.includes('webapp.updated-items')) continue
        var re = /\{"id":"(7\d{15,18})","desc"/g
        var m
        while ((m = re.exec(text)) !== null) {
          var videoId = m[1]
          var ctx = text.substring(m.index, m.index + 600)
          var um = ctx.match(/"uniqueId":"([^"]+)"/)
          if (um) results.push({ id: videoId, user: um[1] })
        }
      }
      return results.map(v => 'https://www.tiktok.com/@' + v.user + '/video/' + v.id)
    })
  `
})
```

---

## Uploading to S3 (LocalStack / fristajl.pl project)

```python
import json, subprocess, os

env = {**os.environ, 'AWS_ACCESS_KEY_ID': 'test', 'AWS_SECRET_ACCESS_KEY': 'test', 'AWS_DEFAULT_REGION': 'us-east-1'}
endpoint = 'http://localhost:4566'
bucket = 'fristajl-prod-tiktoks'

# Read existing
result = subprocess.run(['aws', '--endpoint-url=' + endpoint, 's3', 'cp',
  f's3://{bucket}/trending.json', '-'], capture_output=True, text=True, env=env)
existing = json.loads(result.stdout) if result.returncode == 0 else {'manual': [], 'auto': []}

# Merge new URLs into auto (dedup)
new_urls = [...]  # your collected list
existing_auto = set(existing['auto'])
all_auto = existing['auto'] + [u for u in new_urls if u not in existing_auto]

# Upload
payload = json.dumps({'manual': existing['manual'], 'auto': all_auto}, indent=2)
with open('/tmp/trending.json', 'w') as f:
    f.write(payload)

subprocess.run(['aws', '--endpoint-url=' + endpoint, 's3', 'cp',
  '/tmp/trending.json', f's3://{bucket}/trending.json',
  '--content-type=application/json'], env=env)
```

---

## Known Limitations

| Issue | Cause | Workaround |
|-------|-------|-----------|
| Login popup blocks clicks | TikTok shows sign-up overlay | Press Escape, or use `force: true` + remove overlay via JS |
| Chevron nav buttons hidden (0×0) | Only visible on hover in certain states | Use `mouse.wheel` scroll instead |
| FYP URL stays `tiktok.com/` | TikTok SPA doesn't update URL per video | Intercept API responses instead |
| `document is not defined` | Wrong `run_playwright_code` syntax | Always use `page.evaluate(() => document.xxx)` NOT direct `document.xxx` |
| TypeScript type errors in code | Playwright code runs as plain JS | Avoid `: string[]` annotations, use `var` instead of `let/const` if needed |

---

## Freestyle Rap Hashtags (fristajl.pl project)
Best hashtags for rap/freestyle content:
- `#freestyle` — ~85 URLs, international
- `#fristajl` — ~76 URLs, Polish + international  
- `#freestylerap` — rap-specific
- `#polskirap` — Polish rap
- `#rapbitwa` — Polish rap battles
