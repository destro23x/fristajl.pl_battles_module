package io.javalin.omeglin

import org.junit.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Tests for the validation regexes used in OmeglinMain endpoints.
 * Regexes are copied here so they can be verified in isolation.
 */
class ValidationTest {

    // ── TikTok URL ────────────────────────────────────────────────────────────
    private val tiktokUrlRegex = Regex("^https://www\\.tiktok\\.com/@[^/]+/video/\\d+$")

    @Test fun `valid tiktok url passes`() =
        assertTrue(tiktokUrlRegex.matches("https://www.tiktok.com/@username/video/1234567890"))

    @Test fun `tiktok url with dot in username passes`() =
        assertTrue(tiktokUrlRegex.matches("https://www.tiktok.com/@user.name/video/9876543210"))

    @Test fun `tiktok url with underscore in username passes`() =
        assertTrue(tiktokUrlRegex.matches("https://www.tiktok.com/@user_name/video/111"))

    @Test fun `tiktok url with single digit video id passes`() =
        assertTrue(tiktokUrlRegex.matches("https://www.tiktok.com/@u/video/0"))

    @Test fun `tiktok url without https fails`() =
        assertFalse(tiktokUrlRegex.matches("http://www.tiktok.com/@username/video/123"))

    @Test fun `tiktok url missing at sign fails`() =
        assertFalse(tiktokUrlRegex.matches("https://www.tiktok.com/username/video/123"))

    @Test fun `tiktok url with non-numeric video id fails`() =
        assertFalse(tiktokUrlRegex.matches("https://www.tiktok.com/@username/video/abc123"))

    @Test fun `tiktok url with extra trailing path fails`() =
        assertFalse(tiktokUrlRegex.matches("https://www.tiktok.com/@username/video/123/extra"))

    @Test fun `tiktok url with query string fails`() =
        assertFalse(tiktokUrlRegex.matches("https://www.tiktok.com/@username/video/123?ref=share"))

    @Test fun `empty string fails tiktok validation`() =
        assertFalse(tiktokUrlRegex.matches(""))

    @Test fun `random string fails tiktok validation`() =
        assertFalse(tiktokUrlRegex.matches("not-a-url"))

    // ── Email ─────────────────────────────────────────────────────────────────
    private val emailRegex = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")

    @Test fun `valid email passes`() =
        assertTrue(emailRegex.matches("user@example.com"))

    @Test fun `valid email with subdomain passes`() =
        assertTrue(emailRegex.matches("user@mail.example.co.uk"))

    @Test fun `email without at symbol fails`() =
        assertFalse(emailRegex.matches("userexample.com"))

    @Test fun `email without domain fails`() =
        assertFalse(emailRegex.matches("user@"))

    @Test fun `email without tld fails`() =
        assertFalse(emailRegex.matches("user@example"))

    @Test fun `email with space fails`() =
        assertFalse(emailRegex.matches("us er@example.com"))

    @Test fun `empty string fails email validation`() =
        assertFalse(emailRegex.matches(""))

    // ── MediaPropositionService constants ─────────────────────────────────────
    @Test fun `max image size is 5 MB`() =
        assertTrue(MediaPropositionService.MAX_IMAGE_BYTES == 5L * 1024 * 1024)

    @Test fun `max beat size is 20 MB`() =
        assertTrue(MediaPropositionService.MAX_BEAT_BYTES == 20L * 1024 * 1024)

    @Test fun `jpeg is an allowed image type`() =
        assertTrue("image/jpeg" in MediaPropositionService.ALLOWED_IMAGE_TYPES)

    @Test fun `png is an allowed image type`() =
        assertTrue("image/png" in MediaPropositionService.ALLOWED_IMAGE_TYPES)

    @Test fun `audio mpeg is an allowed beat type`() =
        assertTrue("audio/mpeg" in MediaPropositionService.ALLOWED_BEAT_TYPES)

    @Test fun `video mp4 is not an allowed image type`() =
        assertFalse("video/mp4" in MediaPropositionService.ALLOWED_IMAGE_TYPES)
}
