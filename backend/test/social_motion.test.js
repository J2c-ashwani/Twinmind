import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EPISODES, buildMotionCreative, buildSocialPilotPackage, validateCreative } from '../src/services/growth/reelCreativeService.js';
describe('Social motion pilot contracts', () => {
  it('defaults to A and resolves identical creative from the actual publishing payload', () => {
    const a=buildMotionCreative({mode:'dark'});assert.equal(a.hookVariant,'A');
    for(const episode of EPISODES) for(const hookVariant of ['A','B']) {
      const original=buildMotionCreative({mode:episode.mode,hook:episode.hooks[hookVariant==='B'?1:0],hookVariant});
      const reconstructed=buildMotionCreative({mode:'dark',hook:original.hook,userExcuse:episode.question});
      assert.equal(reconstructed.id,episode.id);assert.equal(reconstructed.hookVariant,hookVariant);
    }
  });
  it('keeps each platform on the same story and preserves LinkedIn link placement', () => {
    for(let i=0;i<14;i++) {
      const date=new Date(Date.UTC(2026,10,13+i));const a=buildSocialPilotPackage(date,{includeCaptionLink:true,utmLink:'https://example.invalid/track'});const b=buildSocialPilotPackage(date,{includeCaptionLink:false});
      assert.equal(a.facebook.creative.question,a.chatDialogue.userDilemma);
      assert.equal(a.facebook.creative.id,a.instagram.creative.id);
      assert(a.linkedin.caption.includes('https://example.invalid/track'));
      assert(!b.linkedin.caption.includes('https://'));assert(a.threads.text.length<=500);
      assert.match(a.facebook.caption,/illustrative example/);validateCreative(a.facebook.creative);
    }
  });
  it('rejects unreviewed testimonial/competitor claims and overlong narration', () => {
    const c=buildMotionCreative();assert.throws(()=>validateCreative({...c,reply:'ChatGPT always forgets you'}));
    assert.throws(()=>validateCreative({...c,narration:['word '.repeat(40),...c.narration.slice(1)]}));
  });
});
