/** Native LinkedIn copy, without invented founder experiences or engagement automation. */
export const LINKEDIN_FORMAT_CALENDAR = Object.freeze({
  1: 'video', 2: 'carousel_pdf', 3: 'text', 4: 'carousel_pdf',
  5: 'video', 6: 'video', 0: 'carousel_pdf'
});

export function getLinkedInFormat(date = new Date()) {
  const weekday = new Date(date.getTime() + 330 * 60000).getUTCDay();
  return LINKEDIN_FORMAT_CALENDAR[weekday];
}

const NOTES = {
  chat: ['A conversation does not always need to become a plan.', 'Someone asking to talk might want reflection, small talk, or something completely ridiculous. Offering a choice leaves room for the person behind the message.', 'One product choice in TwinGenie: make space for different kinds of conversation.', 'What makes an AI reply feel attentive to you?'],
  life_coach: ['The advice you give a friend can be hard to offer yourself.', 'A guided session can make a broad thought easier to explore, one question at a time. The useful part is having somewhere to begin, without being handed a complete life overhaul.', 'TwinGenie includes Life Coach sessions with guided reflection and exercises.', 'What makes a reflection exercise useful enough to return to?'],
  perspectives: ['A short message can turn into a long story in your head.', 'Before replying, it can help to separate what was actually said from the meaning you added. A different perspective is an invitation to reconsider, rather than a claim to know what another person thinks.', 'TwinGenie offers Normal, Reflective, Honest and Future perspectives.', 'When has another perspective changed how you read a situation?'],
  mood: ['A whole week rarely fits inside the word “fine”.', 'There can be a difficult afternoon, a lovely conversation and plenty of ordinary moments in the same week. A reflection tool should leave room for that mix.', 'TwinGenie combines conversations with mood reflection. The illustrative view shows one way to look back at a day.', 'What small detail helps you remember how a day actually felt?'],
  light_chat: ['Small conversations belong in an AI companion, too.', 'A question about a cat, a song or a tiny everyday moment can be a conversation in its own right. Useful does not always have to mean serious.', 'TwinGenie is an AI companion for everyday life, including the lighter parts.', 'What ordinary topic can keep you talking for ages?'],
  memory: ['Personalisation needs more than a welcoming first message.', 'Relevant earlier context can help a later conversation feel connected. The useful question is which context matters now, while leaving room for a person to change.', 'TwinGenie uses conversation memory to bring relevant earlier context forward.', 'What would you want a conversational app to remember—and what should it ask again?'],
  twin_match: ['Different preferences can start a good conversation.', 'A comparison does not have to declare a winner. It can make someone curious about why a friend approaches the same situation differently.', 'Twin Match lets people explore personality similarities and differences after an invitation is accepted.', 'What difference between you and a friend have you learned to appreciate?']
};

export function validateLinkedInEditorial(text) {
  if (typeof text !== 'string' || text.split(/\s+/).length > 180 || text.trim().length < 80) throw new Error('Invalid LinkedIn editorial length');
  if (/https?:|pgvector|\*\*|comment ['"]?yes|guarantee|eliminat\w*.*forever|\b(?:users?|customers?) (?:said|told|reported)|\bI (?:felt|suffered|struggled|caught|used to|woke|noticed|remember|experienced)|(?:last night|yesterday|this morning) I/i.test(text)) throw new Error('Unsupported LinkedIn editorial claim');
  return text.trim();
}

export function buildLinkedInEditorial(episode, date, {includeCaptionLink = false, utmLink, slides = []} = {}) {
  const note = NOTES[episode.feature];
  const caption = episode.linkedinEditorial
    ? validateLinkedInEditorial(episode.linkedinEditorial)
    : `${episode.hook}\n\n${note[1]}\n\nAn illustrative TwinGenie exchange:\n“${episode.question}”\n“${episode.reply}”\n\n${note[2]}\n\n${note[3]}\n\n#TwinGenie #AICompanion`;
  return {
    title: episode.hook,
    caption: caption + (includeCaptionLink && utmLink ? `\n\nExplore TwinGenie: ${utmLink}` : ''),
    format: getLinkedInFormat(date),
    slides,
    includeCaptionLink,
    contentVersion: 'linkedin_editorial_v3'
  };
}
