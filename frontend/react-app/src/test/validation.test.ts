import { describe, it, expect } from 'vitest'

// Mirror of the regex used in OmeglinMain.kt and RandomizerCards.tsx
const TIKTOK_URL_REGEX = /^https:\/\/www\.tiktok\.com\/@[^/]+\/video\/\d+$/

describe('TikTok URL validation', () => {
  const valid = [
    'https://www.tiktok.com/@username/video/1234567890',
    'https://www.tiktok.com/@user.name/video/9876543210',
    'https://www.tiktok.com/@user_name123/video/0',
    'https://www.tiktok.com/@u/video/1',
  ]

  const invalid = [
    'http://www.tiktok.com/@username/video/123',      // http, not https
    'https://www.tiktok.com/username/video/123',       // missing @
    'https://www.tiktok.com/@username/video/abc',      // non-numeric id
    'https://www.tiktok.com/@username/video/123/extra',// extra path
    'https://www.tiktok.com/@username/video/123?ref=x',// query string
    'https://tiktok.com/@username/video/123',          // missing www.
    '',
    'not-a-url',
    'https://www.youtube.com/@user/video/123',
  ]

  it.each(valid)('accepts valid URL: %s', url => {
    expect(TIKTOK_URL_REGEX.test(url)).toBe(true)
  })

  it.each(invalid)('rejects invalid URL: %s', url => {
    expect(TIKTOK_URL_REGEX.test(url)).toBe(false)
  })
})

// Email regex from moderator registration endpoint
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

describe('Email validation', () => {
  const valid = [
    'user@example.com',
    'test.user@domain.co.uk',
    'admin+tag@example.org',
    'mod@fristajl.pl',
  ]

  const invalid = [
    'userexample.com',     // missing @
    'user@',               // missing domain
    'user@example',        // missing TLD
    '@example.com',        // missing local part
    'us er@example.com',   // space
    '',
  ]

  it.each(valid)('accepts valid email: %s', email => {
    expect(EMAIL_REGEX.test(email)).toBe(true)
  })

  it.each(invalid)('rejects invalid email: %s', email => {
    expect(EMAIL_REGEX.test(email)).toBe(false)
  })
})
