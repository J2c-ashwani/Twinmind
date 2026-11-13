# Daily companion content and mixed LinkedIn formats

The default daily path is `companion_daily_v3`. The existing scheduled webhooks call the same orchestrator methods and retain platform leases, daily publication ledgers, pause controls and LinkedIn's no-self-comment policy.

| IST weekday | Feature | LinkedIn format |
| --- | --- | --- |
| Monday | Everyday chat | Native video |
| Tuesday | Life Coach | PDF document |
| Wednesday | Four perspectives | Text |
| Thursday | Mood reflection | PDF document |
| Friday | Light conversation | Native video |
| Saturday | Conversation memory | Native video |
| Sunday | Twin Match with accepted invitation | PDF document |

## Daily path

1. Load the canonical draft for the IST date, or generate a short story using existing Groq/Gemini credentials and recent-topic history. Groq is preferred; a live check found the local default Gemini model unavailable.
2. Validate supported features, length, claims and visual fit. At most two writing attempts are made. Rejected/unavailable writing uses a reviewed feature story. Fallback stories can repeat; novelty is not guaranteed during outages.
3. Use the original three companion artworks with camera movement, layered chat, timed captions and neural speech. Chat speech and UI messages derive from the same fields. This is 2.5D animation, not rigged or lip-synced 3D.
4. Serialize layout/video/carousel workers on the shared app server, load only the artwork in use, and use a low-buffer H.264 encoder. Export remains 1080×1920. Reuse one successful MP4 render across platform callers in the same server process. Cache loss/restart can cause rerendering; canonical story persistence keeps the daily story consistent when the database is available.
5. Upload native media to each platform. LinkedIn initializes/uploads/finalizes a video and waits for AVAILABLE before creating a post. An ambiguous creation result enters VERIFYING and needs feed verification before retry. No text-only success is substituted for a failed video.

Canonical drafts use deterministic UUIDs in the existing `usage_tracking` table. Serialized draft data is namespaced in `action_type`, consistent with the table's existing text-ledger pattern; this does not assume a metadata column or require a migration. Only generated marketing copy is stored. The first successful database writer supplies the canonical draft. Without database access only process-local consistency is available.

LinkedIn uses native captions with an illustrative exchange and a relevant discussion question. Existing caption-link policy is preserved; explicit no-link approved packages are honored. Historical approved packages retain their original format and integrity hash. The new package hash also binds format and creative.

## Unattended operation

No image-generation API is invoked by cron. Artwork made in the chat is bundled in `assets/companion`; fresh daily illustrations would require a separate production image API and budget. Existing writing and edge-tts services still require available credentials/network/quota. No Google Cloud project or startup credits are configured or spent by this change.

LinkedIn and Facebook cron endpoints support `async=true` to acknowledge quickly while the existing orchestrator renders/uploads. Instagram already supports this option. Configure existing cron jobs with that parameter after deploying. HTTP 202 means accepted for work, not published. Check growth status, native platform posts and the publication ledger for the result. Background execution uses the existing server process; it is not a separate persistent task queue.

YouTube's live readiness check returned false on 13 November 2026. There is no dedicated YouTube external cron job in the inspected account; the existing 23:00 IST server sweep calls its publisher. Complete YouTube credentials/OAuth before expecting unattended Shorts. Do not force an upload merely to test deployment.

## Preview and checks

From `backend`:

```sh
node scripts/check_growth_media.js
node scripts/preview_daily_growth.js --date=2026-11-16 --output=/absolute/review/directory
```

The preview uses `draft()`: no database writes and no social publication. Add `--offline=true` to use the reviewed story without provider calls. Outputs include MP4, SRT, six frames, storyboard timing, package and LinkedIn caption. Runtime requires Python/Pillow/edge-tts, ffmpeg/ffprobe and bundled fonts/images.

`REEL_RENDERER_VERSION=legacy` selects the prior generator/renderer. Explicit theme requests retain the legacy curriculum. Deployment/restart is required for changed source; do not interpret a local preview or successful webhook acknowledgement as proof of production publication or reach.

Completion, skip rate, reach, follows and installs must be measured on native platforms. Missing analytics remain unavailable, not zero. Neither this renderer nor the publishing API guarantees virality or the founder's retention/view targets.
