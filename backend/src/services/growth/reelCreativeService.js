/** Curated first pilot: original scenarios, no invented testimonials or competitor quotations. */
export const MOTION_VERSION = 'motion_v2';
export const EPISODES = [
  { id: 'twelve_tabs', mode: 'dark', hooks: ['12 tabs. Zero starts.', 'Still getting ready?'], problem: 'Sometimes planning is a way to avoid the first step.', question: 'Why do I keep restarting?', reply: 'Is planning helping, or delaying the first step?', action: 'Write the first sentence.', narration: ['Twelve tabs open. Still haven’t started?', 'Sometimes planning is a way to avoid the first step.', 'Try asking TwinGenie: What am I avoiding?', 'Choose reflection, honesty, or your future self.', 'Then make the next step smaller.', 'One message. One clearer next step. Meet TwinGenie.'], discussion: 'What is your most convincing excuse for not starting?' },
  { id: 'unsent_message', mode: 'future', hooks: ['Don’t send it. Yet.', 'Six drafts. Same worry.'], problem: 'A delayed reply can turn into a whole story in your head.', question: 'They haven’t replied. What now?', reply: 'What do you know, and what are you assuming?', action: 'Put the phone down for two minutes.', narration: ['You wrote the reply. But should you send it?', 'A little silence can become a whole story in your head.', 'Ask TwinGenie to help separate facts from assumptions.', 'Try the perspective of your future self.', 'Make space before your next move.', 'A pause. A different perspective. Meet TwinGenie.'], discussion: 'What helps you pause before sending a message you might regret?' },
  { id: 'saying_yes', mode: 'reflective', hooks: ['Your mouth said yes.', 'Another yes. No energy.'], problem: 'Agreeing quickly can be easier than explaining what you need.', question: 'Why do I keep saying yes?', reply: 'What would you say if you didn’t need to explain it?', action: '“I can’t this weekend.”', narration: ['Your mouth said yes. Your calendar said no.', 'Sometimes agreeing is easier than explaining what you need.', 'Bring that moment to TwinGenie.', 'Try a reflective perspective before you reply.', 'Practice one small, honest boundary.', 'Less explaining. More clarity. Meet TwinGenie.'], discussion: 'Which is harder: saying no, or not explaining your no?' },
  { id: 'perfect_start', mode: 'normal', hooks: ['The perfect start is late.', 'One more tutorial?'], problem: 'A perfect plan can keep moving the starting line.', question: 'Do I need one more tutorial?', reply: 'What could you try with what you already know?', action: 'Try the smallest version today.', narration: ['One more tutorial. Then you’ll finally start. Right?', 'A perfect plan can keep moving the starting line.', 'Talk it through with TwinGenie.', 'Look at the same problem from another perspective.', 'Try the smallest version today.', 'Start a conversation. Find your next step. TwinGenie.'], discussion: 'What could you try today with what you already know?' },
  { id: 'too_many_choices', mode: 'normal', hooks: ['47 options. No decision.', 'More options. Less clarity.'], problem: 'More options don’t always make the next choice easier.', question: 'How do I choose what matters?', reply: 'Which option fits the goal you actually care about?', action: 'Choose one next step, not your whole life.', narration: ['So many options. And still no decision.', 'More research doesn’t always make the next choice easier.', 'Tell TwinGenie what matters to you.', 'Try a grounded or future perspective.', 'Choose one next step. Not your whole life.', 'Make room for a clearer conversation. Meet TwinGenie.'], discussion: 'What is one choice you could simplify this week?' },
  { id: 'restart_monday', mode: 'dark', hooks: ['Monday called. Again.', 'Another fresh start?'], problem: 'Starting over can feel easier than continuing imperfectly.', question: 'Should I restart on Monday?', reply: 'What would continuing imperfectly look like today?', action: 'Continue for two minutes today.', narration: ['Monday called. You promised to start again.', 'Starting over can feel easier than continuing imperfectly.', 'Ask TwinGenie a different question.', 'What would continuing imperfectly look like today?', 'Try two minutes. Before another restart.', 'A new perspective, for your next step. TwinGenie.'], discussion: 'What would continuing imperfectly look like for you today?' },
];

export function validateCreative(c) {
  if (!c || c.version !== MOTION_VERSION || !EPISODES.some(e => e.id === c.id)) throw new Error('Unknown motion creative');
  for (const key of ['hook', 'problem', 'question', 'reply', 'action']) {
    if (typeof c[key] !== 'string' || !c[key].trim() || c[key].length > 160) throw new Error(`Invalid creative ${key}`);
  }
  if (c.narration?.length !== 6 || c.narration.some(x => typeof x !== 'string' || x.split(/\s+/).length > 16)) throw new Error('Narration must have six short scenes');
  if (/therapist.grade|cure|guaranteed|chatgpt|replika|zero.memory/i.test(JSON.stringify(c))) throw new Error('Unsupported creative claim');
  return c;
}

export function buildMotionCreative(spec = {}) {
  if (spec.creative) return validateCreative(spec.creative);
  const found = EPISODES.find(e => e.hooks.includes(spec.hook) || spec.userExcuse === e.question);
  const episode = found || EPISODES.find(e => e.mode === spec.mode) || EPISODES[0];
  const variant = spec.hookVariant === 'B' || Boolean(found && found.hooks[1] === spec.hook) ? 1 : 0;
  const narration = [...episode.narration];
  if (variant) narration[0] = `${episode.hooks[1]} Let’s look at it differently.`;
  return validateCreative({ ...episode, version: MOTION_VERSION, hook: episode.hooks[variant], hookVariant: variant ? 'B' : 'A', narration, disclosure: 'Illustrative conversation', cta: 'Meet TwinGenie', url: 'https://www.twingenie.app/download' });
}

export function buildSocialPilotPackage(date = new Date(), options = {}) {
  const ist = new Date(date.getTime() + 330 * 60000);
  const day = Math.floor(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) / 86400000);
  const episode = EPISODES[((day % EPISODES.length) + EPISODES.length) % EPISODES.length];
  const variant = options.hookVariant || (Math.floor(day / EPISODES.length) % 2 ? 'B' : 'A');
  const creative = buildMotionCreative({ creative: { ...episode, version: MOTION_VERSION, hook: episode.hooks[variant === 'B' ? 1 : 0], hookVariant: variant, disclosure: 'Illustrative conversation', cta: 'Meet TwinGenie', url: 'https://www.twingenie.app/download', narration: variant === 'B' ? [`${episode.hooks[1]} Let’s look at it differently.`, ...episode.narration.slice(1)] : episode.narration } });
  const campaign = `motion_${episode.id}_${variant.toLowerCase()}`;
  const link = (network) => `https://www.twingenie.app/download?utm_source=${network}&utm_medium=organic&utm_campaign=${campaign}`;
  const caption = `${episode.problem}\n\nTwinGenie offers different perspectives to help you reflect. The conversation shown is an illustrative example.\n\n${episode.discussion}\n\nTry TwinGenie on Google Play. Link in bio.\n#TwinGenie #SelfReflection #Overthinking`;
  const slides = [
    { type: 'hook', title: creative.hook, subtitle: episode.problem, tag: 'A DIFFERENT PERSPECTIVE' },
    { type: 'insight', title: 'Ask a different question', subtitle: episode.question, content: episode.reply, tag: 'ILLUSTRATIVE EXAMPLE' },
    { type: 'insight', title: 'Make it smaller', subtitle: episode.action, content: 'One practical next step can be easier to try than a perfect plan.', tag: 'TRY THIS' },
    { type: 'discussion', title: 'What would you try?', subtitle: 'One thought. One practical next step.', question: episode.discussion, branding: 'TwinGenie · A different perspective', tag: 'TWINGENIE' },
  ];
  for (const slide of slides) slide.visualStyle = MOTION_VERSION;
  let linkedinCaption = `${episode.hooks[0]}\n\n${episode.problem}\n\nA question worth asking: ${episode.reply}\n\nTwinGenie is built around conversations that offer different perspectives. This example shows one way to turn a looping thought into a smaller next step.\n\nTry this: ${episode.action}\n\n${episode.discussion}\n\n#TwinGenie #SelfReflection`;
  if (options.includeCaptionLink) linkedinCaption += `\n\n${options.utmLink || link('linkedin')}`;
  const threads = `${episode.hooks[0]}\n\n${episode.problem}\n\n${episode.discussion}`;
  return { topic: episode.problem, hook: creative.hook, themeId: episode.id, category: 'EVERYDAY CLARITY', mode: episode.mode, modeName: episode.mode, format: 'reel', facebookFormat: 'reel', instagramFormat: 'reel', formatType: MOTION_VERSION, creativeVersion: MOTION_VERSION, istDateStr: ist.toISOString().slice(0,10), dayNumber: day, includeCaptionLink: Boolean(options.includeCaptionLink), utmLink: options.utmLink || link('linkedin'), chatDialogue: { userDilemma: episode.question, twinModeReply: episode.reply, shift: episode.action }, linkedin: { caption: linkedinCaption, slides }, facebook: { title: creative.hook, caption, slides, creative, firstComment: `Try TwinGenie: ${link('facebook')}` }, instagram: { caption, creative, firstComment: `Try TwinGenie: ${link('instagram')}` }, threads: { text: threads }, youtube: { title: creative.hook, description: `${episode.problem}\n\nIllustrative conversation.\n${link('youtube')}`, creative }, experiment: { id: campaign, variant, episode: episode.id, changedVariable: 'opening_hook', baselineSkipRateSource: 'founder_reported_unverified' } };
}
