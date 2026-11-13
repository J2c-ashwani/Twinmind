# Motion reels v2

The daily generator now selects an original six-scene pilot story, with native channel copy. `mediaRendererService.renderReel` builds that same creative for the FB/IG/YouTube callers and invokes `renderers/motionReelRenderer.py`. The orchestrator's Threads path uses the prepared short discussion text. Existing LinkedIn approved-package checks, carousel rendering, publishing leases and schedules are retained.

## Run a preview

From `backend`, generate the spec and render it into a review directory:

```sh
node --input-type=module -e "import {buildMotionCreative} from './src/services/growth/reelCreativeService.js'; console.log(JSON.stringify({creative:buildMotionCreative({mode:'dark',hookVariant:'A'})}));" > /tmp/twingenie-preview.json
python3 src/services/growth/renderers/motionReelRenderer.py "$(cat /tmp/twingenie-preview.json)" /tmp/twingenie-motion/reel.mp4
```

Requirements are the same Pillow/edge-tts/ffmpeg dependencies as the existing renderer. Network access is needed for edge-tts. Narration errors abort rather than silently publishing a voiceless film. The existing publisher may then use its carousel fallback. No Google Cloud service is called.

Exports: MP4, actual word-boundary SRT, timed storyboard JSON, six scene JPGs, local cached narration and render metadata. Use a unique directory per render. Local cache is not a media archive; apply the platform's existing retention rules to old render folders.

## Rollout

`REEL_RENDERER_VERSION=legacy` restores both the legacy daily generation path and the old reel renderer. Without that override, the new daily pilot/renderer is selected. A server deployment/restart is required to run changed source. Existing already-approved LinkedIn packages and already-published posts are not rewritten. Explicit theme requests can still use the legacy generator; review them before publishing because their old copy is not part of the new pilot.

Six pilot stories × two opening hooks are a bounded creative library, not an infinite fresh-content generator. Review results and add approved episodes before repeating the cycle. Hook A/B is an organic creative comparison, not a randomized experiment. Never infer automatic winning hooks from a tiny audience.

## Quality and measurement

Keep one central situation, one visible product example and one action. All demo chat is labelled illustrative. Avoid fabricated competitor responses, customer testimonials, clinical promises and precise memory claims without an actual consented demonstration.

Before publishing: verify scene fit, mobile readability, captions, audio and destination links. The saved creative ID/variant in each storyboard identifies what was rendered. Join native published post IDs to that creative ID when collecting performance. Missing insights are unavailable, never zero.

The existing Meta credential can list posts but currently cannot read the checked Instagram insight metrics. Grant the appropriate insights permission through the account's existing OAuth/admin flow before enabling automated performance reporting. Do not add a secret to source or log an access token. Publication is not proof of reach, retention or acquired users.
