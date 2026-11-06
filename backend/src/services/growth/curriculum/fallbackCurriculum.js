/**
 * TwinGenie Growth Content Curriculum v2
 * 
 * Aligned with CEO Directives:
 * 1. 5-Step Content Structure:
 *    - Step 1: Relatable Human Problem (Hook)
 *    - Step 2: Psychological Insight (Underlying mechanism)
 *    - Step 3: Practical Framework (3 actionable reflection questions / steps)
 *    - Step 4: Natural Product Alignment (Only where relevant; subtle in Pillar 1, contrasting in Pillar 2, educational in Pillar 3)
 *    - Step 5: Authentic Human Discussion Question (No binary engagement bait like "Drop A or B")
 * 
 * 2. 50/30/20 Content Pillar Distribution:
 *    - Pillar 1 (50% target): Human Psychology & Everyday Self-Awareness (18 themes)
 *    - Pillar 2 (30% target): Generic AI Critique vs Personal Cognitive Mirror (10 themes)
 *    - Pillar 3 (20% target): Verified Product Capabilities Deep-Dive (7 themes)
 *    Total: 35 Rotational Fallback Themes
 * 
 * 3. 100% Universal Human Audience:
 *    - Scenarios rotate across students, creators, parents, young adults, professionals.
 *    - Dilemmas: creative block, relationship overthinking, boundary setting, student burnout, career transitions.
 *    - Zero startup founder / executive corporate jargon.
 * 
 * 4. Verified Live Capabilities Only:
 *    - 35-Question Big Five personality baseline
 *    - 365-Day Year-in-Pixels mood matrix
 *    - 4 Cognitive Modes: Normal, Reflective, Honest, Future
 *    - Longitudinal semantic memory via pgvector
 */

export const PILLARS = {
    PILLAR_1: {
        id: 'pillar_1_psychology',
        name: 'Human Psychology & Self-Awareness',
        targetShare: 0.50,
        description: 'Universal human dilemmas, self-reflection, cognitive traps, and emotional awareness.'
    },
    PILLAR_2: {
        id: 'pillar_2_generic_ai',
        name: 'Generic AI Critique vs Personal Mirror',
        targetShare: 0.30,
        description: 'Why agreeable yes-man AI chatbots flatter and reset, and what human growth actually requires.'
    },
    PILLAR_3: {
        id: 'pillar_3_product_demo',
        name: 'Verified Product Capabilities Deep-Dive',
        targetShare: 0.20,
        description: 'Educational walkthrough of live features: 35-question Big Five, Year-in-Pixels, 4 Modes, pgvector memory.'
    }
};

/**
 * Builds a 5-step caption with configurable link placement
 */
function buildCaption({
    hook,
    relatableScenario,
    psychologyInsight,
    practicalFramework,
    productAlignment,
    discussionQuestion,
    hashtags = ['#TwinGenie', '#SelfAwareness', '#MentalClarity', '#PersonalGrowth', '#Mindset'],
    includeCaptionLink = false,
    utmLink = 'https://play.google.com/store/apps/details?id=com.asmind.app'
}) {
    const parts = [];

    // Step 1: Relatable Human Problem (Hook)
    parts.push(hook);
    if (relatableScenario) {
        parts.push(relatableScenario);
    }

    // Step 2: Psychological Insight
    parts.push(psychologyInsight);

    // Step 3: Practical Framework (3 reflection questions / steps)
    if (practicalFramework && practicalFramework.length > 0) {
        const frameworkText = practicalFramework.map((item, idx) => `• ${item}`).join('\n');
        parts.push(`Here is a 3-part framework to check in with yourself:\n${frameworkText}`);
    }

    // Step 4: Natural Product Alignment
    if (productAlignment) {
        parts.push(productAlignment);
    }

    // Step 5: Authentic Discussion Question
    parts.push(discussionQuestion);

    // Arm A: Include Play Store UTM link in caption
    if (includeCaptionLink && utmLink) {
        parts.push(`📲 Explore your cognitive patterns free on Google Play: ${utmLink}`);
    }

    // Hashtags
    if (hashtags && hashtags.length > 0) {
        parts.push(hashtags.join(' '));
    }

    return parts.join('\n\n');
}

/**
 * Helper to build 6 standard slides
 */
function buildSixSlides({
    tag,
    slide1Title,
    slide1Subtitle,
    slide1Takeaways,
    slide2Title,
    slide2Subtitle,
    slide2Bullets,
    slide3Title,
    slide3Subtitle,
    slide3Content,
    slide3Bullets,
    slide3Left,
    slide3Right,
    slide4Title,
    slide4Subtitle,
    slide4Steps,
    slide5Title,
    slide5Subtitle,
    slide5Bullets,
    slide6Title,
    slide6Question,
    slide6Prompts,
    slide6Branding = 'TwinGenie • Reflective Life Companion'
}) {
    const slides = [
        // Slide 1: Hook / Cover
        {
            type: 'cover',
            tag: tag.toUpperCase(),
            title: slide1Title,
            subtitle: slide1Subtitle,
            takeaways: slide1Takeaways || [
                'The hidden subconscious mechanism keeping you stuck',
                'Three practical self-reflection questions for clarity',
                'How to break circular rationalizations in everyday life'
            ]
        },
        // Slide 2: Relatable Example
        {
            type: 'dynamic',
            tag: 'THE EVERYDAY SCENARIO',
            title: slide2Title,
            subtitle: slide2Subtitle,
            bullets: slide2Bullets || []
        },
        // Slide 3: Psychology / Mechanism (or comparison)
        slide3Left && slide3Right ? {
            type: 'comparison',
            tag: 'THE COGNITIVE MECHANISM',
            title: slide3Title,
            subtitle: slide3Subtitle,
            left: slide3Left,
            right: slide3Right
        } : {
            type: 'dynamic',
            tag: 'THE PSYCHOLOGY',
            title: slide3Title,
            subtitle: slide3Subtitle,
            content: slide3Content || '',
            bullets: slide3Bullets || []
        },
        // Slide 4: Practical Framework
        {
            type: 'timeline',
            tag: 'PRACTICAL FRAMEWORK',
            title: slide4Title,
            subtitle: slide4Subtitle,
            steps: slide4Steps || [
                { step: 'QUESTION 01', title: 'Baseline Check', desc: 'Is this decision driven by past investment or future value?' },
                { step: 'QUESTION 02', title: 'Opportunity Cost', desc: 'What else could you create with the emotional energy you are spending here?' },
                { step: 'QUESTION 03', title: 'Honest Truth', desc: 'If you were advising a close friend in this exact spot, what would you tell them?' }
            ]
        },
        // Slide 5: The Cognitive Shift
        {
            type: 'dynamic',
            tag: 'THE REFRAME',
            title: slide5Title,
            subtitle: slide5Subtitle,
            bullets: slide5Bullets || [
                'Past time and effort are already gone; continuing only costs future peace',
                'Changing direction is evidence of learning, not a failure of character',
                'Clarity requires looking forward with honesty rather than backward with guilt'
            ]
        },
        // Slide 6: Discussion & Authentic Question
        {
            type: 'discussion',
            tag: 'OPEN DISCUSSION',
            title: slide6Title || 'Where Do You Draw the Line?',
            question: slide6Question,
            prompts: slide6Prompts || [
                'What is one project, habit, or path you found hard to step away from?',
                'What helped you finally realize it was time to let go?',
                'What would you tell someone facing the same choice today?'
            ],
            branding: slide6Branding
        }
    ];

    return slides;
}

// -------------------------------------------------------------
// 35 CURATED FALLBACK THEMES
// -------------------------------------------------------------

export const CURATED_FALLBACK_THEMES = [
    // =========================================================
    // PILLAR 1: HUMAN PSYCHOLOGY & EVERYDAY SELF-AWARENESS (18)
    // =========================================================
    {
        id: 'sunk_cost_fallacy',
        pillarId: 'pillar_1_psychology',
        topic: 'The Sunk Cost Fallacy: Why We Cling to What Drains Us',
        category: 'SELF-AWARENESS',
        hook: 'The hardest sentence for any human being to utter is: "I was wrong, and I need to let this go."',
        relatableScenario: 'Whether it is a book you aren\'t enjoying, an unfulfilling project you spent months on, or a habit that quietly exhausts you, walking away feels like admitting defeat.',
        psychologyInsight: 'In cognitive psychology, this is the Sunk Cost Fallacy. Our brains confuse past investment with future value. We tell ourselves: "If I stop now, everything I invested was wasted." But past effort is already spent. Staying only spends tomorrow\'s peace.',
        practicalFramework: [
            'If you started from zero today with no past investment, would you choose this path?',
            'Are you holding on because it is actually working, or because you are afraid of the sunk effort?',
            'What is the emotional cost of staying for another six months?'
        ],
        productAlignment: 'Self-awareness is not about never making a mistake—it is about noticing when persistence has quietly turned into self-punishment.',
        discussionQuestion: 'Where do you find it hardest to distinguish between perseverance and stubbornly refusing to accept a mistake?',
        binaryQuestion: {
            prompt: 'When you realize a habit, project, or commitment is draining you, what is your instinct?',
            optionA: '🅰️ Step away immediately without guilt',
            optionB: '🅱️ Keep trying because you have already invested so much?'
        },
        voiceScript: {
            voiceHook: 'Why do we keep clinging to things that drain us instead of letting go?',
            voiceProblem: 'When you invest months into something unfulfilling, your brain tricks you into enduring more pain.',
            voiceSolution: 'True clarity starts when you evaluate future value instead of defending past investments.',
            voiceCta: 'Explore your cognitive patterns with TwinGenie. Free on Google Play.'
        },
        slides: buildSixSlides({
            tag: 'SELF-AWARENESS',
            slide1Title: 'You aren\'t staying because it\'s working.',
            slide1Subtitle: 'You\'re staying because you\'ve invested too much.\nTHE SUNK COST TRAP',
            slide2Title: 'The Universal Dilemma',
            slide2Subtitle: 'Why do we continue in commitments, habits, or projects that drain us?',
            slide2Bullets: [
                'Finishing a dry, uninspiring book simply because you bought it',
                'Enduring months in a draining project to avoid feeling like a quitter',
                'Staying in one-sided dynamics because of "how long we\'ve known each other"'
            ],
            slide3Title: 'The Sunk Cost Mechanism',
            slide3Subtitle: 'How past investment hijacks forward-looking decisions:',
            slide3Content: 'Cognitive psychology shows that human loss aversion is twice as powerful as the desire for gain. We rationalize enduring future discomfort simply to avoid acknowledging past losses.',
            slide4Title: 'The 3-Question Reset',
            slide4Subtitle: 'Three questions to help decide whether to continue or step away:',
            slide4Steps: [
                { step: 'QUESTION 01', title: 'Day Zero Test', desc: 'If you had zero past history here, would you choose to enter this today?' },
                { step: 'QUESTION 02', title: 'Opportunity Cost', desc: 'What else could you create with the emotional bandwidth you are losing here?' },
                { step: 'QUESTION 03', title: 'The 6-Month Test', desc: 'If nothing changes over the next 6 months, how will you feel about staying?' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Reframing closure from loss to freedom:',
            slide5Bullets: [
                'Walking away is not wasted time; it is tuition paid for self-knowledge',
                'Your past self made the best choice with the data they had',
                'Your responsibility today is to your future self, not your past sunk cost'
            ],
            slide6Title: 'Where Do You Draw the Line?',
            slide6Question: 'Where do you find it hardest to distinguish between healthy perseverance and refusing to admit a mistake?',
            slide6Prompts: [
                'Have you ever stayed in something long after you knew it wasn\'t working?',
                'What finally gave you the clarity to let go?',
                'What advice would you give someone in that spot right now?'
            ]
        })
    },
    {
        id: 'avoidance_trap',
        pillarId: 'pillar_1_psychology',
        topic: 'The Avoidance Trap: Why Busyness Disguises Fear',
        category: 'HABITS & CLARITY',
        hook: 'Running around putting out self-created fires feels like hard work. Most of the time, it is just disguised fear.',
        relatableScenario: 'When we dread an uncomfortable task—a vulnerable conversation, writing that first draft, or studying for an exam—we reorganize desktop folders, wipe down the kitchen counter, and check email six times.',
        psychologyInsight: 'In behavioral psychology, this is "productive procrastination." The brain seeks the dopamine of small completions while quietly dodging the emotional friction of what actually matters.',
        practicalFramework: [
            'What is the one task you have rearranged on your to-do list for three days in a row?',
            'What is the specific uncomfortable feeling (boredom, fear of failure, confusion) you are trying to avoid feeling?',
            'What would happen if you sat with that discomfort for just two minutes before opening a new tab?'
        ],
        productAlignment: 'Grounded self-reflection does not judge your avoidance; it gently turns on the light so you can see what you are running from.',
        discussionQuestion: 'What is your telltale "productive procrastination" habit when you are avoiding something uncomfortable?',
        slides: buildSixSlides({
            tag: 'HABITS & CLARITY',
            slide1Title: 'Motion is not progress.',
            slide1Subtitle: 'Why frantic busyness is often sophisticated avoidance in disguise.',
            slide2Title: 'The Avoidance Loop',
            slide2Subtitle: 'The micro-crises we manufacture when dreading real work:',
            slide2Bullets: [
                'Cleaning your entire desk instead of writing the opening paragraph',
                'Reorganizing notion templates and productivity tools for the fourth time',
                'Answering low-priority emails instantly while putting off the main decision'
            ],
            slide3Title: 'The Psychology of Avoidance',
            slide3Subtitle: 'Why our nervous system treats difficult tasks as threats:',
            slide3Content: 'Task avoidance is rarely about laziness or poor time management. It is an emotional regulation problem. When a task triggers self-doubt, our brain instinctively seeks safe, low-stakes dopamine.',
            slide4Title: 'The 3-Step Discomfort Audit',
            slide4Subtitle: 'How to break through the avoidance cycle:',
            slide4Steps: [
                { step: 'STEP 01', title: 'Name the Fear', desc: 'Is the friction fear of looking foolish, fear of failing, or simple ambiguity?' },
                { step: 'STEP 02', title: 'Lower the Stakes', desc: 'Commit to writing one messy sentence or opening the document for 120 seconds.' },
                { step: 'STEP 03', title: 'Notice the Relief', desc: 'Observe how the dread dissipates the moment action replaces anticipation.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Shifting from avoidance to self-compassion:',
            slide5Bullets: [
                'You don\'t need to "feel ready" to begin; action generates motivation',
                'A messy, imperfect first effort is infinitely more valuable than a tidy excuse',
                'Rest is productive, but busyness used as a shield only prolongs anxiety'
            ],
            slide6Title: 'Honest Self-Check',
            slide6Question: 'What is your telltale "busywork" habit when you are avoiding something truly important?',
            slide6Prompts: [
                'What is on your to-do list right now that has been carried over for days?',
                'What feeling are you trying to avoid by not starting it?',
                'What is the smallest step you could take today to break the spell?'
            ]
        })
    },
    {
        id: 'people_pleasing_tax',
        pillarId: 'pillar_1_psychology',
        topic: 'The People-Pleasing Tax: The Cost of Chronic Accommodation',
        category: 'RELATIONSHIPS',
        hook: 'Every time you say "yes" to keep someone else comfortable, you quietly say "no" to yourself.',
        relatableScenario: 'Agreeing to weekend plans when you are exhausted, taking on extra tasks when your plate is overflowing, or softening your honest opinion so you don\'t make waves.',
        psychologyInsight: 'People-pleasing is not kindness; it is conflict avoidance. It trades acute short-term discomfort (saying no) for chronic long-term resentment. Over time, that unexpressed resentment erodes trust and exhausts your nervous system.',
        practicalFramework: [
            'Will saying yes here build genuine connection, or just prevent temporary tension?',
            'If you say yes, will you feel resentful toward them by Friday?',
            'What is the kindest, calmest way to say: "I care about this, but I cannot take it on right now"?'
        ],
        productAlignment: 'Learning to set boundaries without guilt is a skill that requires practicing self-awareness in real time.',
        discussionQuestion: 'Where in your life do you find it hardest to say "no" without offering three paragraphs of unnecessary justification?',
        slides: buildSixSlides({
            tag: 'RELATIONSHIPS & BOUNDARIES',
            slide1Title: 'Saying yes to everything',
            slide1Subtitle: 'is quietly saying no to your own peace and wellbeing.\nTHE PEOPLE-PLEASING TAX',
            slide2Title: 'The Familiar Scenario',
            slide2Subtitle: 'How chronic accommodation disguises itself as kindness:',
            slide2Bullets: [
                'Volunteering to help even when you are on the verge of physical burnout',
                'Softening your real feedback to prevent even mild friction',
                'Over-explaining your reasons for turning down an invitation'
            ],
            slide3Title: 'Kindness vs Accommodation',
            slide3Subtitle: 'The psychological roots of over-agreeableness:',
            slide3Content: 'True kindness comes from a full cup with zero hidden resentment. Chronic accommodation is a survival reflex—protecting oneself against rejection by making oneself indispensable.',
            slide4Title: 'The 3-Second Boundary Check',
            slide4Subtitle: 'Before saying yes automatically, run this mental audit:',
            slide4Steps: [
                { step: 'PAUSE 01', title: 'Buy Yourself Time', desc: 'Never agree on the spot. "Let me check my calendar and get back to you by noon."' },
                { step: 'CHECK 02', title: 'Resentment Forecast', desc: 'If you agree, will you feel irritated when the day arrives? If yes, it is a no.' },
                { step: 'SPEAK 03', title: 'Clean Delivery', desc: 'Deliver a warm, concise refusal without crafting fictional emergencies.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Reframing boundaries as relationship preservation:',
            slide5Bullets: [
                'A boundary is not a wall; it is the bridge that keeps you from resenting others',
                'People who respect you will respect your limits; those who benefit from your lack of limits will resist',
                'You are allowed to protect your energy without earning permission first'
            ],
            slide6Title: 'Your Perspective',
            slide6Question: 'Where do you find it hardest to say "no" without feeling the urge to over-explain yourself?',
            slide6Prompts: [
                'What is the last thing you agreed to that you immediately regretted?',
                'What was the fear behind not saying no directly?',
                'What boundary would give you the most breathing room this week?'
            ]
        })
    },
    {
        id: 'boundary_guilt',
        pillarId: 'pillar_1_psychology',
        topic: 'Boundary-Setting Guilt: Why Feeling Guilty Doesn\'t Mean You Were Wrong',
        category: 'EMOTIONAL HEALTH',
        hook: 'Feeling guilty after setting a boundary does not mean the boundary was wrong. It means you are breaking a lifelong pattern.',
        relatableScenario: 'You finally tell someone you can\'t lend money, attend a family gathering, or answer work texts at 10 PM. Five minutes later, a sick knot forms in your stomach, whispering: "Maybe I was being selfish."',
        psychologyInsight: 'When you are conditioned to prioritize others\' comfort over your own well-being, healthy boundaries feel unnatural to your nervous system. Your brain interprets unfamiliar autonomy as relational danger.',
        practicalFramework: [
            'Are you feeling guilty because you actually caused harm, or because you allowed someone else to experience mild disappointment?',
            'Would you judge a friend harshly for setting the exact same boundary?',
            'Can you sit with the physical sensation of guilt for ten minutes without rushing to apologize?'
        ],
        productAlignment: 'Emotional maturity is being able to tolerate the short discomfort of a boundary instead of running back into people-pleasing.',
        discussionQuestion: 'What was the last boundary you set that made you feel intensely guilty, and how do you view it in hindsight?',
        slides: buildSixSlides({
            tag: 'EMOTIONAL HEALTH',
            slide1Title: 'Guilt is not evidence of wrongdoing.',
            slide1Subtitle: 'Why setting healthy boundaries feels uncomfortable at first.',
            slide2Title: 'The Post-Boundary Spiral',
            slide2Subtitle: 'What happens five minutes after setting a healthy limit:',
            slide2Bullets: [
                'Drafting a follow-up apology message to soften the impact',
                'Replaying their reaction in your head and wondering if they are angry',
                'Telling yourself that endurance would have been easier than the guilt'
            ],
            slide3Title: 'The Conditioning Mechanism',
            slide3Subtitle: 'Why unfamiliar boundaries trigger false guilt alarms:',
            slide3Content: 'If your baseline was always being available, setting a limit registers as a deviation from safety. The guilt is not a moral compass; it is withdrawal from old habit loops.',
            slide4Title: 'The Disappointment Tolerance Framework',
            slide4Subtitle: 'Three truths to remember when the guilt alarm sounds:',
            slide4Steps: [
                { step: 'TRUTH 01', title: 'Disappointment is Normal', desc: 'Other people are allowed to feel disappointed without you having to fix it.' },
                { step: 'TRUTH 02', title: 'No Urgent Fixing', desc: 'Resist the impulse to soften or retract your boundary within the first 24 hours.' },
                { step: 'TRUTH 03', title: 'Observe the Outcome', desc: 'Notice that healthy relationships survive boundaries; fragile dynamics expose themselves.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'From self-abandonment to self-trust:',
            slide5Bullets: [
                'You do not have to set yourself on fire to keep other people warm',
                'Protecting your emotional health is the prerequisite for being genuinely helpful',
                'A clean "no" is an act of honesty; a resentful "yes" is a quiet betrayal'
            ],
            slide6Title: 'Reflection',
            slide6Question: 'What was the last boundary that made you feel intensely guilty—and was it the right call in hindsight?',
            slide6Prompts: [
                'How did you feel 24 hours after setting it?',
                'Did the relationship adapt or push back?',
                'What did you learn about your own limits?'
            ]
        })
    },
    {
        id: 'overthinking_silence',
        pillarId: 'pillar_1_psychology',
        topic: 'Overthinking Silence: Why Delayed Replies Trigger Worst-Case Stories',
        category: 'MINDSET & ANXIETY',
        hook: 'Left on read for three hours, and your brain has already written an entire tragic screenplay about how they secretly hate you.',
        relatableScenario: 'You send a message to a friend, manager, or partner. Hours tick by. Instead of thinking "they are busy at the dentist," you mentally inventory every interaction from the past two months to find what you did wrong.',
        psychologyInsight: 'In cognitive science, this is "ambiguity intolerance" coupled with threat bias. The human brain hates unanswered blanks, so it fills the vacuum with familiar anxieties.',
        practicalFramework: [
            'What are three neutral, boring explanations for the delay that have nothing to do with you?',
            'Has spiraling ever changed the reply you eventually received?',
            'Can you put your phone across the room and engage in one physical activity for 20 minutes?'
        ],
        productAlignment: 'Recognizing when you are arguing with an imaginary story rather than reality is the cornerstone of mental clarity.',
        discussionQuestion: 'When someone doesn\'t reply right away, what is the default worst-case narrative your brain tends to construct?',
        slides: buildSixSlides({
            tag: 'MINDSET & ANXIETY',
            slide1Title: 'Silence is just silence.',
            slide1Subtitle: 'Why unanswered messages trigger an internal worst-case screenplay.',
            slide2Title: 'The Spiral in 3 Hours',
            slide2Subtitle: 'How a normal pause in communication becomes a mental crisis:',
            slide2Bullets: [
                'Rereading your last message five times to check tone and punctuation',
                'Wondering if a comment you made three weeks ago caused an issue',
                'Feeling the urge to send a follow-up check-in that you later regret'
            ],
            slide3Title: 'Threat Bias in Communication',
            slide3Subtitle: 'Why the brain treats neutral silence as social danger:',
            slide3Content: 'Evolutionarily, social exclusion felt life-threatening. When modern screens present ambiguous pauses, ancient alarm bells interpret simple logistical busyness as social rejection.',
            slide4Title: 'The Reality Check Protocol',
            slide4Subtitle: 'Three grounding questions when you find yourself spiraling:',
            slide4Steps: [
                { step: 'CHECK 01', title: 'The Neutral List', desc: 'List three mundane reasons for the delay: stuck in traffic, low battery, focused at work.' },
                { step: 'CHECK 02', title: 'Fact vs Projection', desc: 'Identify the exact facts you know vs the assumptions you have invented.' },
                { step: 'CHECK 03', title: 'The 24-Hour Rule', desc: 'Commit to zero reactive messages until a full day has passed without news.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Reclaiming your calm from ambiguous feedback:',
            slide5Bullets: [
                'Other people\'s response time reflects their current schedule, not your inherent worth',
                'You do not have to solve an imagined problem in real time',
                'Peace comes from letting unanswered questions exist without filling the silence with fear'
            ],
            slide6Title: 'Discussion',
            slide6Question: 'When someone doesn\'t reply right away, what is the default worst-case story your brain constructs?',
            slide6Prompts: [
                'How often has your catastrophic narrative turned out to be accurate?',
                'What is your healthiest strategy to disengage from your phone during a spiral?',
                'What would you tell a friend who was in that loop right now?'
            ]
        })
    },
    {
        id: 'perfectionism_paralysis',
        pillarId: 'pillar_1_psychology',
        topic: 'Perfectionism Paralysis: Why Waiting to Feel Ready is Fear in a Tuxedo',
        category: 'CREATIVITY & WORK',
        hook: 'Perfectionism is not a commitment to high standards. It is the fear of being seen making an imperfect attempt.',
        relatableScenario: 'You want to start writing, share a project, learn an instrument, or pitch an idea. But you tell yourself: "I just need to research more, get better equipment, and wait until life calms down."',
        psychologyInsight: 'Psychologists call this "shielding behavior." By keeping the work in the realm of theory and research, you protect yourself from the vulnerable friction of real-world feedback.',
        practicalFramework: [
            'What is the smallest, messiest version of this idea you could put into the world today?',
            'What feedback are you most afraid of receiving?',
            'Would you rather be admired for an unreleased concept, or learn from a real attempt?'
        ],
        productAlignment: 'Gaining confidence requires completing imperfect cycles, not perfecting unreleased plans.',
        discussionQuestion: 'What is one creative or personal project you have kept "in preparation" for far longer than necessary?',
        slides: buildSixSlides({
            tag: 'CREATIVITY & WORK',
            slide1Title: 'Perfectionism is fear in a tuxedo.',
            slide1Subtitle: 'Why "waiting until you\'re ready" keeps your best ideas locked away.',
            slide2Title: 'The Preparation Trap',
            slide2Subtitle: 'How hesitation disguises itself as thoroughness:',
            slide2Bullets: [
                'Buying more courses and books instead of doing the first rep',
                'Refining slide layouts and formatting while avoiding the core substance',
                'Waiting for a quiet season of life that never seems to arrive'
            ],
            slide3Title: 'Standards vs Shielding',
            slide3Subtitle: 'The emotional root of perpetual preparation:',
            slide3Content: 'Healthy standards inspire effort. Toxic perfectionism is an emotional armor: if I never finish or publish, no one can ever criticize or evaluate my real ability.',
            slide4Title: 'The "Good Enough" Launch Matrix',
            slide4Subtitle: 'Three steps to move from drafting to real feedback:',
            slide4Steps: [
                { step: 'STAGE 01', title: 'Define Minimum Viable', desc: 'What is the absolute bare minimum version that still delivers genuine value?' },
                { step: 'STAGE 02', title: 'Set a Hard Deadline', desc: 'Choose a date and agree to release whatever exists at 5 PM on that day.' },
                { step: 'STAGE 03', title: 'Treat it as a Draft', desc: 'Reframe release from a final exam to an ongoing iterative conversation.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Redefining progress through iteration:',
            slide5Bullets: [
                'Finished is better than perfect, because finished gives you real data to improve',
                'Confidence is built after you survive making mistakes, not beforehand',
                'The world needs your genuine, imperfect contribution more than your polished silence'
            ],
            slide6Title: 'Open Prompt',
            slide6Question: 'What is one project or decision you have kept "in preparation" for months, and what is the real fear behind releasing it?',
            slide6Prompts: [
                'What is the worst-case scenario if it is received with a shrug?',
                'What is the cost of never finding out?',
                'What is step one you could take in the next 24 hours?'
            ]
        })
    },
    {
        id: 'student_burnout',
        pillarId: 'pillar_1_psychology',
        topic: 'Student & Career Burnout: Why Resting Without Guilt Feels Impossible',
        category: 'WELLBEING',
        hook: 'You sit on the sofa trying to relax, but an internal voice whispers that you should be studying, working, or optimizing something.',
        relatableScenario: 'Whether facing finals week, job applications, or project deliverables, your free time feels contaminated by the mental shadow of everything left undone.',
        psychologyInsight: 'This is "work-identity fusion." When your sense of worth becomes tied solely to output, taking breaks registers as moral failure rather than physiological necessity.',
        practicalFramework: [
            'When you take a break, are you actually resting, or just anxiously worrying while not working?',
            'What would happen if you scheduled rest as a non-negotiable appointment on your calendar?',
            'Can you define "enough for today" before you open your laptop in the morning?'
        ],
        productAlignment: 'Sustained growth comes from cyclical rhythms of effort and deep recovery, not continuous low-grade exhaustion.',
        discussionQuestion: 'What does genuine, guilt-free rest look like for you, and how often do you actually experience it?',
        slides: buildSixSlides({
            tag: 'WELLBEING & BURNOUT',
            slide1Title: 'Rest without recovery',
            slide1Subtitle: 'is just exhausting worry in a different room.\nBREAKING THE BURNOUT LOOP',
            slide2Title: 'The Contaminated Break',
            slide2Subtitle: 'What happens when downtime feels like guilt:',
            slide2Bullets: [
                'Watching a movie while mentally scrolling through your unfinished task backlog',
                'Feeling exhausted all day, yet unable to sleep peacefully at night',
                'Treating self-care as something you have to "earn" through suffering'
            ],
            slide3Title: 'The Identity-Output Trap',
            slide3Subtitle: 'Why modern culture conditions us to equate rest with weakness:',
            slide3Content: 'When self-worth is tied to continuous productivity, the nervous system never enters restorative parasympathetic recovery. The result is chronic, low-grade fatigue that drains creativity.',
            slide4Title: 'The Rest Restoration Architecture',
            slide4Subtitle: 'Three rules to reclaim true recovery:',
            slide4Steps: [
                { step: 'RULE 01', title: 'Define "Done for Today"', desc: 'Establish a clear, realistic boundary for when work ends each evening.' },
                { step: 'RULE 02', title: 'Device Separation', desc: 'Physical distance from notifications is the prerequisite for mental decompression.' },
                { step: 'RULE 03', title: 'Schedule Non-Negotiable Rest', desc: 'Put recovery on your calendar with the same priority as an important appointment.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Reframing recovery as fuel:',
            slide5Bullets: [
                'Rest is not a reward for completed work; it is the prerequisite for good thinking',
                'You are a human being with biological limits, not an industrial machine',
                'Taking care of yourself is not selfish; it preserves your capacity for everything you care about'
            ],
            slide6Title: 'Reflection',
            slide6Question: 'What does genuine, guilt-free rest look like for you, and when was the last time you allowed yourself to have it?',
            slide6Prompts: [
                'What is the voice in your head usually saying when you try to relax?',
                'What would a healthy boundary look like this weekend?',
                'Who in your life models healthy boundaries with work and rest?'
            ]
        })
    },
    {
        id: 'decision_fatigue',
        pillarId: 'pillar_1_psychology',
        topic: 'Decision Fatigue: Why Minor Choices Feel Paralyzing When You\'re Overwhelmed',
        category: 'MENTAL CLARITY',
        hook: 'Ever stood in front of a pantry or stared at a dinner menu feeling on the verge of tears because choosing felt too heavy?',
        relatableScenario: 'After a long day of navigating deadlines, family responsibilities, and endless messages, choosing what to cook or what podcast to listen to feels completely overwhelming.',
        psychologyInsight: 'Every conscious choice—from an executive decision down to selecting a shirt—draws from the same finite pool of executive function. When your cognitive budget is drained, your brain shifts into decision paralysis.',
        practicalFramework: [
            'Which repetitive everyday choices can you automate or eliminate through simple routines?',
            'Are you struggling with the decision itself, or are you simply exhausted?',
            'Can you establish a "good enough" threshold for low-stakes decisions?'
        ],
        productAlignment: 'Protecting your mental bandwidth means automating trivial choices so your energy goes to what actually matters.',
        discussionQuestion: 'What small, daily decision exhausts more of your mental energy than it rightfully deserves?',
        slides: buildSixSlides({
            tag: 'MENTAL CLARITY',
            slide1Title: 'Your brain has a daily budget.',
            slide1Subtitle: 'Why small choices feel impossible when you are running on empty.\nDECISION FATIGUE',
            slide2Title: 'The Pantry Freeze',
            slide2Subtitle: 'How decision fatigue shows up at the end of the day:',
            slide2Bullets: [
                'Spending 45 minutes scrolling Netflix without picking a movie',
                'Feeling irritated by a simple question like "What do you want for dinner?"',
                'Defaulting to junk food or doomscrolling because thinking feels too hard'
            ],
            slide3Title: 'Executive Bandwidth Depletion',
            slide3Subtitle: 'The science of mental exhaustion:',
            slide3Content: 'The prefrontal cortex does not distinguish between big moral dilemmas and tiny micro-choices. Answering 80 notifications exhausts the same neurological circuit needed for deep life decisions.',
            slide4Title: 'The Bandwidth Preservation System',
            slide4Subtitle: 'Three ways to protect your decision energy:',
            slide4Steps: [
                { step: 'SYSTEM 01', title: 'Automate Low-Stakes', desc: 'Standardize meals, wardrobe, and morning routines to conserve executive fuel.' },
                { step: 'SYSTEM 02', title: 'The Two-Option Rule', desc: 'Whenever you are overwhelmed, narrow choices down to two and flip a coin.' },
                { step: 'SYSTEM 03', title: 'Morning Priority', desc: 'Make your hardest, most meaningful call in the first 90 minutes of the day.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Recognizing exhaustion as a signal:',
            slide5Bullets: [
                'When choosing feels paralyzing, stop analyzing and look for physical rest',
                'Not every decision requires optimization; "satisficing" preserves sanity',
                'Simplicity in your environment translates into clarity in your mind'
            ],
            slide6Title: 'Self-Inquiry',
            slide6Question: 'What small, recurring daily decision drains more of your mental energy than it rightfully deserves?',
            slide6Prompts: [
                'What is one routine you could standardize this week to free up headspace?',
                'How do you notice when your decision battery has hit 5%?',
                'What helps you reset when you feel that cognitive wall?'
            ]
        })
    },
    {
        id: 'comparison_trap',
        pillarId: 'pillar_1_psychology',
        topic: 'The Social Comparison Loop: Measuring Your Behind-the-Scenes by Highlight Reels',
        category: 'SELF-WORTH',
        hook: 'We compare our private insecurities, doubts, and messy days to everyone else\'s curated public highlight reel.',
        relatableScenario: 'You are having a quiet Tuesday in sweatpants, open an app, and within thirty seconds you feel behind in career, fitness, relationships, and lifestyle.',
        psychologyInsight: 'Social comparison theory shows our brains naturally calibrate status against nearby peers. But digital feeds present an engineered illusion of effortless success, creating artificial deficiency.',
        practicalFramework: [
            'Whose life or milestones currently make you feel subtly insecure or "behind"?',
            'Are you comparing their peak moment to your messy middle?',
            'What is one thing in your everyday life right now that you used to pray for three years ago?'
        ],
        productAlignment: 'True self-reflection anchors your focus on your own trajectory, values, and pace.',
        discussionQuestion: 'What area of your life feels most susceptible to social comparison, and how do you ground yourself when it spikes?',
        slides: buildSixSlides({
            tag: 'SELF-WORTH & PERSPECTIVE',
            slide1Title: 'You are comparing your bloopers',
            slide1Subtitle: 'to everyone else\'s curated highlight reel.\nTHE COMPARISON TRAP',
            slide2Title: 'The 30-Second Deficit',
            slide2Subtitle: 'How a quick scroll turns into sudden inadequacy:',
            slide2Bullets: [
                'Feeling content until you see someone your age achieve a major milestone',
                'Wondering why everyone else seems to have their life cleanly organized',
                'Downplaying your own steady progress because it doesn\'t look flashy'
            ],
            slide3Title: 'The Asymmetric Comparison Bias',
            slide3Subtitle: 'Why social comparison online is inherently rigged:',
            slide3Content: 'We possess full, unfiltered visibility into our own doubts, mistakes, and fears, but only observe the polished outputs of others. Comparing the two is mathematically guaranteed to create feelings of failure.',
            slide4Title: 'The Grounding Framework',
            slide4Subtitle: 'Three reminders when the comparison loop begins:',
            slide4Steps: [
                { step: 'STEP 01', title: 'Acknowledge the Edit', desc: 'Remind yourself that nobody posts their quiet panic, rejections, or mundane routines.' },
                { step: 'STEP 02', title: 'Check Your Own Baseline', desc: 'Compare who you are today to who you were three years ago, not to a stranger.' },
                { step: 'STEP 03', title: 'Curate Your Horizon', desc: 'Mute accounts that consistently trigger feelings of inadequacy rather than inspiration.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Returning to your own lane:',
            slide5Bullets: [
                'Someone else\'s success does not subtract an ounce of opportunity from your life',
                'Life is not a standardized test with a universal scoring rubric',
                'The only meaningful race is the one between your current self and your potential'
            ],
            slide6Title: 'Honest Discussion',
            slide6Question: 'What area of your life feels most vulnerable to comparison, and what brings you back to reality?',
            slide6Prompts: [
                'When was the last time someone else\'s post triggered unexpected envy?',
                'What is something in your life today that your past self would be proud of?',
                'How can you protect your mental horizon this week?'
            ]
        })
    },
    {
        id: 'creative_block',
        pillarId: 'pillar_1_psychology',
        topic: 'The Creative Block Myth: Waiting for Inspiration vs. Tolerating Bad Drafts',
        category: 'CREATIVE WORK',
        hook: 'Creative block is rarely a lack of ideas. It is an intolerance for the discomfort of producing bad first attempts.',
        relatableScenario: 'Staring at a blank document, a clean canvas, or an empty presentation slide, waiting for a bolt of inspiration to strike before typing the first word.',
        psychologyInsight: 'Professional creators know that inspiration is an output of momentum, not an input. The fear of making something mediocre paralyzes the hand before the first draft can emerge.',
        practicalFramework: [
            'Can you give yourself permission to write the absolute worst possible first paragraph?',
            'What is the expectation of brilliance you are holding over this draft?',
            'What would happen if you focused on showing up for 15 minutes instead of finishing the whole piece?'
        ],
        productAlignment: 'Breaking through creative friction requires compassionate permission to iterate in public.',
        discussionQuestion: 'How do you coax yourself into starting when your creative confidence is running low?',
        slides: buildSixSlides({
            tag: 'CREATIVE WORK',
            slide1Title: 'You don\'t have a creative block.',
            slide1Subtitle: 'You have a high expectation for a first draft.\nTHE CREATIVITY TRAP',
            slide2Title: 'The Blank Page Standoff',
            slide2Subtitle: 'How the myth of divine inspiration keeps you stuck:',
            slide2Bullets: [
                'Waiting to "feel inspired" before sitting down to work',
                'Deleting the first three sentences because they sound clumsy',
                'Mistaking initial awkwardness for evidence of lack of talent'
            ],
            slide3Title: 'Inspiration Follows Action',
            slide3Subtitle: 'The cognitive mechanics of creative flow:',
            slide3Content: 'Flow is an neurochemical state triggered by focused engagement over time. You cannot think your way into creative momentum; you have to work your way into it through messy early repetitions.',
            slide4Title: 'The "Ugly First Draft" Protocol',
            slide4Subtitle: 'Three steps to unlock creative output:',
            slide4Steps: [
                { step: 'PERMISSION 01', title: 'The Garbage Draft', desc: 'Explicitly aim to create something flawed, clumsy, and raw just to get momentum.' },
                { step: 'CONTAINMENT 02', title: 'Timer Constraints', desc: 'Set a 20-minute timer. During that window, the backspace key is banned.' },
                { step: 'SEPARATION 03', title: 'Creator vs Editor', desc: 'Never create and critique simultaneously. Write today; edit tomorrow.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Reframing creativity as a practice:',
            slide5Bullets: [
                'A bad page can be edited; a blank page cannot',
                'Great work is simply mediocre work that received patient, thoughtful revision',
                'Your worth as a creator is proven by your willingness to endure clumsy beginnings'
            ],
            slide6Title: 'Your Experience',
            slide6Question: 'How do you get yourself to start when your creative confidence is running near zero?',
            slide6Prompts: [
                'What is your go-to ritual to move from staring to doing?',
                'What is a project you created that started out terribly and turned out great?',
                'What would you tell someone staring at a blank page right now?'
            ]
        })
    },
    {
        id: 'imposter_phenomenon',
        pillarId: 'pillar_1_psychology',
        topic: 'Imposter Syndrome: Why Competent People Feel Like Frauds',
        category: 'SELF-WORTH',
        hook: 'The irony of imposter syndrome is that true frauds never experience it. Only people who care deeply about their craft do.',
        relatableScenario: 'You receive praise, earn a promotion, or get invited into a room—and your first thought is: "They made a mistake. It is only a matter of time before they find out I have no idea what I\'m doing."',
        psychologyInsight: 'The Dunning-Kruger effect explains why incompetent people feel unjustified confidence, while thoughtful people see how much they don\'t know. Self-doubt is often the byproduct of high standards.',
        practicalFramework: [
            'Can you distinguish between feeling unqualified and actually being unqualified?',
            'What objective evidence contradicts your fear of being a fraud?',
            'What would you say if someone you respect expressed the exact same self-doubt to you?'
        ],
        productAlignment: 'Developing self-trust is about looking at objective facts rather than believing transient anxious thoughts.',
        discussionQuestion: 'In what situation did you feel most like an imposter, only to realize later that you were fully capable?',
        slides: buildSixSlides({
            tag: 'SELF-WORTH & CONFIDENCE',
            slide1Title: 'True frauds never worry',
            slide1Subtitle: 'about being frauds.\nUNDERSTANDING IMPOSTER SYNDROME',
            slide2Title: 'The Secret Panic',
            slide2Subtitle: 'The internal dialogue after a win or new milestone:',
            slide2Bullets: [
                'Attributing achievements purely to "luck," "timing," or "kind people"',
                'Waiting for someone to discover that you don\'t know everything',
                'Over-preparing to the point of exhaustion to compensate for perceived inadequacy'
            ],
            slide3Title: 'The Competence Paradox',
            slide3Subtitle: 'Why high capability invites deeper self-doubt:',
            slide3Content: 'As expertise grows, you become acutely aware of nuances, edge cases, and unanswered questions. Because you see the vast complexity of the field, your own knowledge feels small by comparison.',
            slide4Title: 'The Evidence-Based Reality Check',
            slide4Subtitle: 'Three tools to ground your confidence in facts:',
            slide4Steps: [
                { step: 'AUDIT 01', title: 'The Receipts Folder', desc: 'Maintain an objective record of completed work, feedback, and tangible results.' },
                { step: 'SEPARATION 02', title: 'Feeling vs Fact', desc: 'Notice when an emotion says "I am lost" while the facts say "I am learning."' },
                { step: 'NORMALIZATION 03', title: 'Everyone is Learning', desc: 'Realize that everyone around you is also navigating uncertainty in real time.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'From fraud to student:',
            slide5Bullets: [
                'You don\'t need to know everything to belong in the room; you just need curiosity and integrity',
                'Feeling out of your depth is the definition of being in a growth zone',
                'Confidence is not knowing you will succeed; it is knowing you can handle figuring it out'
            ],
            slide6Title: 'Open Question',
            slide6Question: 'When was a time you felt completely unqualified for something, but figured it out anyway?',
            slide6Prompts: [
                'What helped you push through the initial self-doubt?',
                'How do you handle praise when your brain wants to dismiss it?',
                'What would you say to someone stepping into a new arena today?'
            ]
        })
    },
    {
        id: 'late_night_revenge',
        pillarId: 'pillar_1_psychology',
        topic: 'Revenge Bedtime Procrastination: Stealing Rest to Reclaim Control',
        category: 'HABITS & SLEEP',
        hook: 'You are exhausted, your eyes hurt, and tomorrow begins in six hours. Yet you cannot bring yourself to put the phone down and sleep.',
        relatableScenario: 'It is midnight. You spent twelve hours running errands, answering demands, and fulfilling responsibilities. The only time that feels truly yours is this quiet, late-night window—so you sacrifice sleep to keep it.',
        psychologyInsight: 'Coined as "revenge bedtime procrastination," this is an attempt to regain agency when daytime hours felt out of control. It is a rebellion against daytime demands using the only weapon available: tomorrow\'s energy.',
        practicalFramework: [
            'What autonomy or breathing room are you lacking during your daylight hours?',
            'Is scrolling past midnight actually restoring your spirit, or just numbing your fatigue?',
            'What would a 15-minute sanctuary of personal peace look like at 2 PM instead of 1 AM?'
        ],
        productAlignment: 'Honoring your rest starts by designing daytime pockets of autonomy rather than stealing from tomorrow.',
        discussionQuestion: 'What is your late-night doomscrolling trigger, and what is your daytime life missing that prompts it?',
        slides: buildSixSlides({
            tag: 'HABITS & SLEEP',
            slide1Title: 'You aren\'t addicted to scrolling.',
            slide1Subtitle: 'You are starving for personal autonomy during the day.\nREVENGE BEDTIME PROCRASTINATION',
            slide2Title: 'The Midnight Rebellion',
            slide2Subtitle: 'Why exhausted people stay awake late:',
            slide2Bullets: [
                'Feeling like daytime belongs entirely to bosses, family, and errands',
                'Treating 11 PM to 1 AM as the only time you answer to nobody',
                'Trading tomorrow\'s focus and mood for an hour of hollow stimulation'
            ],
            slide3Title: 'The Psychology of Stolen Time',
            slide3Subtitle: 'The emotional root of late-night delays:',
            slide3Content: 'Bedtime procrastination is rarely a sleep disorder; it is a symptom of daytime disempowerment. When the day provides no margin for play or quiet, the subconscious revolts at night.',
            slide4Title: 'The Daytime Agency Protocol',
            slide4Subtitle: 'Three ways to restore daytime autonomy:',
            slide4Steps: [
                { step: 'HABIT 01', title: 'Daytime Micro-Sanctuaries', desc: 'Schedule 20 minutes of pure unstructured personal time during daylight hours.' },
                { step: 'HABIT 02', title: 'Wind-Down Buffer', desc: 'Replace phone scrolling with low-dopamine relaxation: tea, reading, stretching.' },
                { step: 'HABIT 03', title: 'The Phone Docking Station', desc: 'Charge your phone across the room 30 minutes before your target sleep time.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'From revenge to genuine self-care:',
            slide5Bullets: [
                'True rest is the highest form of personal sovereignty and self-respect',
                'Sleep is not an obstacle to your free time; it is the foundation of tomorrow\'s clarity',
                'Reclaiming your life happens in the daylight, not in the glow of a midnight screen'
            ],
            slide6Title: 'Honest Inquiry',
            slide6Question: 'What is your daytime schedule missing that makes late-night revenge scrolling so tempting?',
            slide6Prompts: [
                'What is your usual screen time between 11 PM and 1 AM?',
                'How does that late hour affect your mood the next morning?',
                'What is one small daytime boundary that would give you breathing room?'
            ]
        })
    },
    {
        id: 'habit_drift',
        pillarId: 'pillar_1_psychology',
        topic: 'Goal Drift: How Micro-Compromises Replace What You Care About',
        category: 'HABITS & VALUES',
        hook: 'Nobody wakes up and intentionally abandons their values. It happens one micro-compromise at a time.',
        relatableScenario: 'You promise yourself you will write, exercise, or protect family dinners. Then a busy week hits. You skip one day, then three. Six months later, your daily routine bears zero resemblance to your stated priorities.',
        psychologyInsight: 'In behavioral systems, this is "drift." Without an honest feedback loop that reflects your cumulative choices back to you, small rationalizations slowly rewrite your baseline.',
        practicalFramework: [
            'What is one habit or practice you quietly dropped in the last 90 days?',
            'What rationalization did you use to justify letting it slide?',
            'What is the smallest step to reintroduce it tomorrow without guilt?'
        ],
        productAlignment: 'Self-awareness is having a gentle mirror that notices when daily actions have quietly drifted from stated values.',
        discussionQuestion: 'What is one priority you quietly allowed to slip away this year, and what would it take to reclaim it?',
        slides: buildSixSlides({
            tag: 'HABITS & VALUES',
            slide1Title: 'Drift is silent.',
            slide1Subtitle: 'How micro-excuses slowly rewrite your daily reality.\nTHE ANATOMY OF GOAL DRIFT',
            slide2Title: 'The Quiet Slippage',
            slide2Subtitle: 'How intentions fade over 90 days:',
            slide2Bullets: [
                '"Just for today, I\'ll skip the morning walk because I\'m tired"',
                '"I\'ll check work messages during dinner just this once"',
                'Finding yourself months later living a lifestyle you never consciously chose'
            ],
            slide3Title: 'The Slow Shift of Baselines',
            slide3Subtitle: 'Why single exceptions compound into new normals:',
            slide3Content: 'Cognitive dissonance makes us justify our departures from our ideals. Each time we make an exception, our brain adjusts its perception of "acceptable," turning temporary lapses into permanent baselines.',
            slide4Title: 'The Compass Re-Alignment',
            slide4Subtitle: 'Three practices to catch drift early:',
            slide4Steps: [
                { step: 'AUDIT 01', title: 'The Weekly Calendar Audit', desc: 'Look at your bank statements and calendar—they reveal your real priorities.' },
                { step: 'RULE 02', title: 'The Never-Twice Rule', desc: 'Missing once is an accident; missing twice in a row is the start of a new habit.' },
                { step: 'ACTION 03', title: 'Reset Without Shame', desc: 'Reclaim the habit at half the intensity immediately rather than waiting for next Monday.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'From drift to intentionality:',
            slide5Bullets: [
                'You do not rise to the level of your goals; you fall to the level of your systems',
                'Self-forgiveness is the fastest path back to consistency',
                'Your life is shaped by what you practice daily, not what you intend to do someday'
            ],
            slide6Title: 'Discussion',
            slide6Question: 'What is one personal priority you quietly allowed to slip away, and what would it take to reclaim it?',
            slide6Prompts: [
                'What was the initial excuse that opened the door to drift?',
                'What did you miss most during the time it was gone?',
                'How can you make resuming it low-friction tomorrow?'
            ]
        })
    },
    {
        id: 'confirmation_bias',
        pillarId: 'pillar_1_psychology',
        topic: 'Confirmation Bias in Daily Life: Finding Proof for Our Insecurities',
        category: 'SELF-AWARENESS',
        hook: 'When you secretly believe you are not good enough, your brain treats neutral comments as undeniable proof of your inadequacy.',
        relatableScenario: 'A coworker doesn\'t smile in the hallway, or a friend takes a few hours to reply. If you feel insecure, you immediately think: "I knew they didn\'t like me." If you felt confident, you wouldn\'t have noticed.',
        psychologyInsight: 'Confirmation bias is not just about political news; it directs our emotional lives. We unconsciously filter out evidence that contradicts our core insecurities while clinging to anything that confirms them.',
        practicalFramework: [
            'What is the core insecurity you frequently look for evidence to confirm?',
            'What neutral event recently did you interpret through that negative lens?',
            'What is an equally plausible, non-threatening explanation for what happened?'
        ],
        productAlignment: 'Developing self-awareness is catching the cognitive filter before it turns neutral data into personal pain.',
        discussionQuestion: 'What is an insecurity that frequently distorts how you interpret other people\'s neutral behavior?',
        slides: buildSixSlides({
            tag: 'SELF-AWARENESS & BIAS',
            slide1Title: 'Your brain sees what it expects.',
            slide1Subtitle: 'How confirmation bias turns neutral interactions into emotional wounds.\nTHE INNER FILTER',
            slide2Title: 'The Hallway Incident',
            slide2Subtitle: 'How insecurity filters everyday moments:',
            slide2Bullets: [
                'Someone walks by without saying hello, and you assume they are upset with you',
                'Receiving nine pieces of praise and one mild suggestion, and obsessing over the critique',
                'Interpreting a brief email as passive-aggressive'
            ],
            slide3Title: 'The Confirmation Engine',
            slide3Subtitle: 'Why the brain actively seeks evidence for self-doubt:',
            slide3Content: 'Cognitive schemas act as predictive templates. If you hold a subconscious belief that you are unworthy or unwanted, your attention selectively catalogs every data point that confirms that expectation.',
            slide4Title: 'The Cognitive Filter Test',
            slide4Subtitle: 'Three questions to challenge emotional confirmation bias:',
            slide4Steps: [
                { step: 'TEST 01', title: 'Identify the Filter', desc: 'What underlying story ("I am annoying," "I am a burden") is coloring this moment?' },
                { step: 'TEST 02', title: 'The Alternate Jury', desc: 'What would an impartial observer say about the exact physical facts?' },
                { step: 'TEST 03', title: 'Search for Counter-Evidence', desc: 'Actively list three instances where this person showed genuine care or warmth.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Separating reality from internal commentary:',
            slide5Bullets: [
                'Other people\'s moods belong to them, not to your track record of behavior',
                'You are not responsible for decoding hidden signals in simple, neutral communications',
                'Peace is assuming goodwill until someone clearly and directly communicates otherwise'
            ],
            slide6Title: 'Open Reflection',
            slide6Question: 'What is an insecurity that frequently distorts how you interpret someone else\'s neutral behavior?',
            slide6Prompts: [
                'How often has someone been "cold" to you simply because they were dealing with their own stress?',
                'What is your telltale sign that you are projecting an insecurity?',
                'What grounding mantra helps you pause before reacting?'
            ]
        })
    },
    {
        id: 'forgiving_past_self',
        pillarId: 'pillar_1_psychology',
        topic: 'Forgiving Your Past Self: The Difference Between Remorse and Wisdom',
        category: 'EMOTIONAL HEALING',
        hook: 'Judging your past self with the knowledge you have today is like being angry at a child for not knowing calculus.',
        relatableScenario: 'Lying awake cringing at an awkward message from five years ago, or beating yourself up over a financial, relationship, or career choice made when you were younger and less experienced.',
        psychologyInsight: 'Hindsight bias tricks us into believing the outcome was obvious all along. We forget that our past self was acting under different information, emotional maturity, and survival pressures.',
        practicalFramework: [
            'What mistake does your mind drag out when you are already feeling vulnerable?',
            'What information, maturity, or perspective do you have now that you lacked back then?',
            'Can you thank your past self for surviving long enough to learn that lesson?'
        ],
        productAlignment: 'Real growth transforms past regrets from weapons of self-punishment into quiet pillars of wisdom.',
        discussionQuestion: 'What is a past mistake that took you a long time to forgive yourself for, and what did it teach you?',
        slides: buildSixSlides({
            tag: 'EMOTIONAL HEALING',
            slide1Title: 'Hindsight is an unfair judge.',
            slide1Subtitle: 'Why beating up your past self ignores the reality of how we learn.\nFORGIVING THE PAST',
            slide2Title: 'The Midnight Cringe',
            slide2Subtitle: 'The mental habit of relitigating old decisions:',
            slide2Bullets: [
                'Replaying a failed conversation or relationship from years ago',
                'Wondering "Why was I so naive or blind to what was happening?"',
                'Carrying chronic remorse as if it proves you are a good person now'
            ],
            slide3Title: 'Hindsight Bias & Memory',
            slide3Subtitle: 'The cognitive error of evaluating past choices:',
            slide3Content: 'Hindsight bias rewires memory so outcomes seem inevitable. We judge our younger self using wisdom that only exists precisely because that younger self endured the consequences of that mistake.',
            slide4Title: 'The Self-Reconciliation Protocol',
            slide4Subtitle: 'Three steps to make peace with your history:',
            slide4Steps: [
                { step: 'STEP 01', title: 'Contextualize the Moment', desc: 'Recall the emotional state, age, and limited data your past self actually had.' },
                { step: 'STEP 02', title: 'Extract the Asset', desc: 'Identify the specific character strength or boundary born from that painful error.' },
                { step: 'STEP 03', title: 'Retire the Prosecutor', desc: 'Remorse has a statute of limitations; punishment after wisdom is just self-harm.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'From regret to gratitude:',
            slide5Bullets: [
                'You cannot rewrite the first chapter, but you can write the rest with clarity',
                'Your cringe is proof that you have grown; stagnation would feel comfortable',
                'Your past self did the best they could with the tools they had'
            ],
            slide6Title: 'Discussion',
            slide6Question: 'What past mistake took you a long time to forgive yourself for, and what perspective finally helped you let it go?',
            slide6Prompts: [
                'What would you say if you could sit down with your younger self for five minutes?',
                'What strength did that painful chapter force you to develop?',
                'Who in your life needs to hear this message today?'
            ]
        })
    },
    {
        id: 'emotional_reactivity',
        pillarId: 'pillar_1_psychology',
        topic: 'The Space Between Stimulus and Response: The Power of the Pause',
        category: 'EMOTIONAL REGULATION',
        hook: 'Between a trigger and your reaction, there is a five-second window. In that tiny window lives your entire freedom.',
        relatableScenario: 'A sharp comment in an email, a driver cutting you off, or a family member pushing an old button. The instinct is to fire back immediately with equal heat.',
        psychologyInsight: 'When triggered, the amygdala initiates an emotional hijack before the rational prefrontal cortex can process context. A deliberate pause of just five seconds allows the nervous system to re-engage conscious choice.',
        practicalFramework: [
            'What is your physical tell when you are triggered (tight jaw, shallow breathing, racing chest)?',
            'Can you commit to taking three deep belly breaths before speaking or replying?',
            'What would the calmest, wisest version of yourself do in this exact situation?'
        ],
        productAlignment: 'Emotional self-mastery is not about never feeling anger; it is about choosing your response rather than being dictated by an impulse.',
        discussionQuestion: 'What is your most reliable personal technique to prevent yourself from reacting impulsively when triggered?',
        slides: buildSixSlides({
            tag: 'EMOTIONAL REGULATION',
            slide1Title: 'Five seconds of silence',
            slide1Subtitle: 'can save you five months of regret.\nTHE POWER OF THE PAUSE',
            slide2Title: 'The Hair-Trigger Moment',
            slide2Subtitle: 'How small incidents turn into explosive regret:',
            slide2Bullets: [
                'Shooting back a defensive reply within 10 seconds of reading an email',
                'Escalating an argument over a minor household chore',
                'Saying the one hurtful thing you know you cannot take back'
            ],
            slide3Title: 'The Amygdala Hijack',
            slide3Subtitle: 'What happens in the brain during emotional triggers:',
            slide3Content: 'The emotional survival center processes input 40 milliseconds faster than the prefrontal cortex. Without a trained pause, you react from raw defensive survival instincts rather than thoughtful human logic.',
            slide4Title: 'The 5-Second Circuit Breaker',
            slide4Subtitle: 'Three grounding actions in the moment of friction:',
            slide4Steps: [
                { step: 'BREATHE 01', title: 'The Physiological Sigh', desc: 'Two quick inhales through the nose, followed by one long exhale through the mouth.' },
                { step: 'DELAY 02', title: 'The Draft Protocol', desc: 'Write the angry message in your notes app. Never send it on the same day.' },
                { step: 'QUESTION 03', title: 'The Tomorrow Test', desc: 'Ask: "Will sending this bring me closer to peace tomorrow, or just relieve anger today?"' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'From reaction to conscious response:',
            slide5Bullets: [
                'You don\'t have to attend every fight you are invited to',
                'Restraint is not weakness; it is the ultimate demonstration of self-command',
                'Your peace of mind is worth more than having the last word'
            ],
            slide6Title: 'Self-Reflection',
            slide6Question: 'What is your most reliable personal tool to stop yourself from reacting impulsively when triggered?',
            slide6Prompts: [
                'What is your physical signal that your amygdala has taken over?',
                'What was a time you took a deep breath and were grateful you paused?',
                'How has your emotional regulation evolved over the past few years?'
            ]
        })
    },
    {
        id: 'fear_of_missing_out',
        pillarId: 'pillar_1_psychology',
        topic: 'The Quiet Beauty of JOMO: Trading Social Anxiety for Present Peace',
        category: 'MINDFULNESS',
        hook: 'FOMO is the fear that someone else is having a better life without you. JOMO is the quiet joy of being completely content where you are.',
        relatableScenario: 'It\'s Friday night. You are curled up with a cup of tea or a good book, perfectly relaxed. You open your phone, see friends at a crowded party or dinner, and instantly feel restless and inadequate.',
        psychologyInsight: 'The fear of missing out is rooted in ancient evolutionary anxiety about ostracism. But modern life bombards us with thousands of choices, making it mathematically impossible to be everywhere. Contentment requires embracing selective absence.',
        practicalFramework: [
            'What activities genuinely recharge your soul versus those you attend out of social obligation?',
            'Can you celebrate someone else having fun without feeling that your quiet evening is a failure?',
            'What is one social invitation you can decline this month to gift yourself a night of peace?'
        ],
        productAlignment: 'True mental clarity is learning to feel at home in your own quiet moments without seeking constant external validation.',
        discussionQuestion: 'What is your favorite way to spend an evening in complete JOMO (Joy of Missing Out)?',
        slides: buildSixSlides({
            tag: 'MINDFULNESS & PEACE',
            slide1Title: 'You don\'t need to be everywhere.',
            slide1Subtitle: 'Embracing the Joy of Missing Out in a culture of hyper-connectivity.\nTHE JOMO SHIFT',
            slide2Title: 'The Friday Night Ambush',
            slide2Subtitle: 'How contentment turns into restlessness in ten seconds:',
            slide2Bullets: [
                'Feeling peaceful at home until you check social media stories',
                'Agreeing to events you dread just to prove you are active',
                'Treating an empty weekend calendar as something to be ashamed of'
            ],
            slide3Title: 'The Social Saturation Problem',
            slide3Subtitle: 'Why modern hyper-awareness breeds anxiety:',
            slide3Content: 'Historically, humans were aware of at most 50 people in their tribe. Today, you are exposed to the selective celebrations of thousands. Attempting to match that pace creates chronic nervous exhaustion.',
            slide4Title: 'The JOMO Reclaiming Framework',
            slide4Subtitle: 'Three practices to cultivate content solitude:',
            slide4Steps: [
                { step: 'CULTIVATE 01', title: 'The Phone-Free Evening', desc: 'Turn off notifications by 7 PM on nights you designate for real rest.' },
                { step: 'SAVOR 02', title: 'Sensory Immersion', desc: 'Immerse fully in simple sensory pleasures: cooking, music, a walk, or reading.' },
                { step: 'CELEBRATE 03', title: 'Deliberate Absence', desc: 'Treat an open calendar block with the same reverence as a VIP reservation.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'From scarcity to abundance:',
            slide5Bullets: [
                'Saying no to background noise is how you say yes to your deepest creative work',
                'Your life is happening right in front of you, not in the palm of your hand',
                'Quiet evenings are not lost opportunities; they are where self-knowledge is born'
            ],
            slide6Title: 'Discussion',
            slide6Question: 'What is your favorite way to spend an evening in complete, unapologetic JOMO?',
            slide6Prompts: [
                'What is the last social obligation you declined, and how did it feel?',
                'What simple ritual makes you feel completely content at home?',
                'What would your ideal weekend look like with zero social pressure?'
            ]
        })
    },
    {
        id: 'difficult_conversations',
        pillarId: 'pillar_1_psychology',
        topic: 'The Unspoken Conversation: Why What You Refuse to Say Runs Your Life',
        category: 'RELATIONSHIPS & TRUTH',
        hook: 'The quality of your life is directly proportional to the number of uncomfortable conversations you are willing to have.',
        relatableScenario: 'A boundary that needs setting, an apology that is long overdue, or expressing what you truly need in a relationship. Instead, you swallow the words and let silent resentment simmer for months.',
        psychologyInsight: 'We avoid difficult conversations because our brain anticipates confrontation and discomfort. But unspoken truths don\'t disappear; they morph into passive aggression, emotional distance, and chronic tension.',
        practicalFramework: [
            'What is the one honest conversation you have been avoiding for more than two weeks?',
            'What is the worst-case scenario you fear if you speak up with kindness and clarity?',
            'What is the guaranteed cost to the relationship if you remain silent for another six months?'
        ],
        productAlignment: 'Clarity is an act of courage. Speaking the truth with compassion creates real safety in your life.',
        discussionQuestion: 'What is a difficult conversation you delayed having, and what happened when you finally spoke up?',
        slides: buildSixSlides({
            tag: 'RELATIONSHIPS & TRUTH',
            slide1Title: 'Unspoken words don\'t die.',
            slide1Subtitle: 'They are buried alive and come back as resentment and distance.\nTHE UNCOMFORTABLE TRUTH',
            slide2Title: 'The Silent Simulation',
            slide2Subtitle: 'The mental exhausting loop of delaying hard talks:',
            slide2Bullets: [
                'Rehearsing arguments in the shower that you never actually deliver',
                'Hoping the other person will magically guess what is bothering you',
                'Letting resentment build until a tiny incident causes an explosion'
            ],
            slide3Title: 'The Friction Trade-Off',
            slide3Subtitle: 'Why avoiding temporary tension causes permanent fractures:',
            slide3Content: 'Conflict avoidance feels safe in the moment, but it trades a ten-minute uncomfortable talk for months of emotional erosion. Clear, gentle honesty is the only foundation for durable trust.',
            slide4Title: 'The Compassionate Clarity Script',
            slide4Subtitle: 'Three steps to initiate a difficult conversation:',
            slide4Steps: [
                { step: 'INTENTION 01', title: 'State Your Goodwill', desc: 'Start by framing the conversation around preserving and strengthening the bond.' },
                { step: 'FACTS 02', title: 'Stick to Observable Data', desc: 'Describe specific events and your internal experience without attacking their character.' },
                { step: 'INVITATION 03', title: 'Listen to Their View', desc: 'Ask: "How did that look from your perspective?" and listen without defending.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Reframing honesty as love:',
            slide5Bullets: [
                'Clarity is kindness; ambiguity is unkind',
                'A relationship that cannot survive honest, gentle feedback is already fragile',
                'You cannot change what you are unwilling to voice'
            ],
            slide6Title: 'Open Prompt',
            slide6Question: 'What is a difficult conversation you postponed for far too long, and what happened when you finally spoke up?',
            slide6Prompts: [
                'What was the fear that kept you silent?',
                'Did the outcome match the catastrophe you had imagined?',
                'What conversation in your life needs to happen this month?'
            ]
        })
    },

    // =========================================================
    // PILLAR 2: GENERIC AI CRITIQUE VS PERSONAL MIRROR (10)
    // =========================================================
    {
        id: 'flattery_trap',
        pillarId: 'pillar_2_generic_ai',
        topic: 'The Flattery Trap: Why Yes-Man AI Chatbots Stunt Personal Growth',
        category: 'AI & SELF-GROWTH',
        hook: 'Most conversational AI is trained to be an agreeable yes-man. It strokes your ego, validates your excuses, and keeps you stuck.',
        relatableScenario: 'You open a standard chatbot, rationalize why you delayed your main project, and it replies: "Rest is so important! You\'re doing amazing! Here are 10 positive affirmations!" It feels nice, but nothing changes.',
        psychologyInsight: 'LLMs are fine-tuned via RLHF to maximize user satisfaction scores. That creates an inherent bias toward sycophancy—telling you what feels comfortable rather than what is true.',
        practicalFramework: [
            'Do you want tools that validate your comfort zone, or tools that help you see your blind spots?',
            'When was the last time advice that genuinely changed your life felt comfortable to hear in the first five seconds?',
            'What would happen if your tools held up an honest mirror instead of a cheerleader pom-pom?'
        ],
        productAlignment: 'That is why we engineered TwinGenie with Honest Twin Mode: an AI alter-ego that gently challenges rationalizations using your own stated values.',
        discussionQuestion: 'Do you prefer an AI that gives you gentle validation or one that offers constructive friction? Where do you draw the line?',
        slides: buildSixSlides({
            tag: 'AI & SELF-GROWTH',
            slide1Title: 'Sycophancy is not empathy.',
            slide1Subtitle: 'Why standard chatbots act like flattering yes-men.\nTHE FLATTERY TRAP',
            slide2Title: 'The Agreeable Bot Loop',
            slide2Subtitle: 'What happens when you share a real rationalization with standard AI:',
            slide2Bullets: [
                'You: "I scrolled for 4 hours and got nothing done today."',
                'Standard Bot: "Be kind to yourself! Rest is productive! You deserve it!"',
                'Result: Your procrastination is validated, and the loop repeats tomorrow'
            ],
            slide3Title: 'The Architecture of Sycophancy',
            slide3Subtitle: 'Why mainstream LLMs are incentivized to flatter you:',
            slide3Content: 'Standard models are tuned on human preference ratings. A response that challenges a user risks getting a lower thumbs-down rating. This creates an engineered bias toward artificial agreeableness.',
            slide4Title: 'The Cognitive Mirror Paradigm',
            slide4Subtitle: 'What an honest thinking companion requires:',
            slide4Steps: [
                { step: 'PILLAR 01', title: 'Constructive Friction', desc: 'The courage to ask: "Is this exhaustion, or are you avoiding the fear of starting?"' },
                { step: 'PILLAR 02', title: 'Value Alignment', desc: 'Checking current behavior against your own stated goals, not external rules.' },
                { step: 'PILLAR 03', title: 'Compassionate Truth', desc: 'Direct, honest clarity delivered with deep psychological empathy.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'From comfort to transformation:',
            slide5Bullets: [
                'Flattery reinforces your comfort zone; honest friction expands it',
                'A true digital twin should act like your wisest alter-ego, not an obsequious assistant',
                'Self-awareness requires tools designed for insight, not ego protection'
            ],
            slide6Title: 'Discussion',
            slide6Question: 'When you are working through a hard dilemma, what helps you more: unconditional validation, or honest friction?',
            slide6Prompts: [
                'Have you ever noticed an AI bot agreeing with something you knew was an excuse?',
                'How do you tell the difference between healthy support and unhelpful flattery?',
                'What is one honest truth you needed to hear this year?'
            ]
        })
    },
    {
        id: 'stateless_amnesia',
        pillarId: 'pillar_2_generic_ai',
        topic: 'The Reset-Button Problem: Why Stateless Chatbots Fail Long-Term Growth',
        category: 'AI ARCHITECTURE',
        hook: 'Why do 90% of people abandon AI companions after two weeks? Because every chat is Day One all over again.',
        relatableScenario: 'You poured your heart out on Monday, worked through an emotional dilemma, and found clarity. On Thursday you open the app, and it greets you with: "Hello! How can I help you today?" It forgot everything.',
        psychologyInsight: 'Human self-awareness is longitudinal. Real growth happens when someone notices patterns across weeks: "You felt this same hesitation three weeks ago before that other decision." A stateless chatbot cannot do that.',
        practicalFramework: [
            'How much emotional energy do you waste re-explaining your backstory to digital tools?',
            'What recurring behavioral loops might you spot if your tools remembered your conversations across months?',
            'What would it feel like to have a companion that tracks your personal growth over an entire year?'
        ],
        productAlignment: 'TwinGenie uses persistent pgvector semantic memory across conversations so your reflection builds compounding context rather than resetting to zero.',
        discussionQuestion: 'What is the biggest frustration you experience when using standard AI tools for personal thinking?',
        slides: buildSixSlides({
            tag: 'AI ARCHITECTURE & MEMORY',
            slide1Title: 'Stateless AI is a goldfish.',
            slide1Subtitle: 'Why reset-button chatbots cannot help you build long-term habits.\nTHE MEMORY GAP',
            slide2Title: 'The Groundhog Day Chat',
            slide2Subtitle: 'The frustration of starting from scratch every single time:',
            slide2Bullets: [
                'Re-typing your career background, relationship context, and goals every week',
                'Receiving generic first-grade advice because the model has zero history',
                'Losing the breakthrough insights from last week\'s conversations'
            ],
            slide3Title: 'The Longitudinal Moat',
            slide3Subtitle: 'Why true personal growth requires continuous memory:',
            slide3Content: 'Human habit loops operate over multi-week cycles. Single-session interactions only capture acute transient feelings, missing the underlying behavioral rhythms that drive our real lives.',
            slide4Title: 'The Compounding Memory Pipeline',
            slide4Subtitle: 'How longitudinal vector memory transforms self-reflection:',
            slide4Steps: [
                { step: 'STAGE 01', title: 'Encrypted Embeddings', desc: 'Key insights and emotional markers are stored privately via vector database.' },
                { step: 'STAGE 02', title: 'Pattern Recognition', desc: 'Connecting a Tuesday hesitation to a similar dilemma logged three weeks ago.' },
                { step: 'STAGE 03', title: 'Compounding Insight', desc: 'Your digital twin grows wiser and more attuned to your actual life over time.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'From transactional queries to compounding reflection:',
            slide5Bullets: [
                'A companion that remembers who you are changes how deeply you explore',
                'Privacy and memory can coexist through local encryption and zero third-party training',
                'Your personal growth journey deserves continuity, not a daily reset button'
            ],
            slide6Title: 'Your View',
            slide6Question: 'How would your relationship with technology change if your tools remembered your goals and growth over years?',
            slide6Prompts: [
                'What is something you wish an AI companion remembered about your journey?',
                'What makes you abandon digital journaling or reflection tools?',
                'What does a trustworthy digital confidant look like to you?'
            ]
        })
    },
    {
        id: 'escapism_vs_reality',
        pillarId: 'pillar_2_generic_ai',
        topic: 'Fantasy vs Reality: Why Roleplaying with Anime Bots Won\'t Build Your Life',
        category: 'DIGITAL CULTURE',
        hook: 'Stop roleplaying with fictional anime characters who tell you what you want to hear. Start building your actual life.',
        relatableScenario: 'Millions of young adults spend hours every evening chatting with fictional fantasy bots. It offers quick relief from loneliness, but leaves real-world relationships and goals untouched.',
        psychologyInsight: 'Fictional AI companions provide pseudo-intimacy without vulnerability. They cannot push back, demand growth, or build resilience. It is emotional escapism disguised as connection.',
        practicalFramework: [
            'Are you using technology to avoid your real-world anxieties, or to develop the courage to face them?',
            'What would happen if your digital companion was modeled on your own highest aspirations instead of a fantasy character?',
            'What is one real-world relationship you can invest ten minutes in today?'
        ],
        productAlignment: 'TwinGenie is built not as an escapist fantasy, but as an honest cognitive mirror designed to help you thrive in the real world.',
        discussionQuestion: 'Where do you see the boundary between healthy digital decompression and unhealthy emotional escapism?',
        slides: buildSixSlides({
            tag: 'DIGITAL CULTURE & REALITY',
            slide1Title: 'Escapism is not healing.',
            slide1Subtitle: 'Why fantasy roleplay bots distract from real personal development.\nREALITY VS ESCAPISM',
            slide2Title: 'The Pseudo-Intimacy Loop',
            slide2Subtitle: 'The hidden cost of artificial comfort without growth:',
            slide2Bullets: [
                'Spending hours curating conversations with characters who never disagree',
                'Avoiding the uncomfortable vulnerability required for real-world relationships',
                'Ending the session feeling temporarily soothed, but fundamentally unchanged'
            ],
            slide3Title: 'The Escapism Reflex',
            slide3Subtitle: 'Why fantasy bots appeal to lonely nervous systems:',
            slide3Content: 'Real human relationships involve friction, compromise, and the risk of rejection. Fictional bots offer simulated affection with zero emotional risk, conditioning users to withdraw from messy real life.',
            slide4Title: 'The Real-World Anchor',
            slide4Subtitle: 'Three criteria for healthy AI companionship:',
            slide4Steps: [
                { step: 'CRITERIA 01', title: 'Points Inward', desc: 'Directs focus toward your real goals, habits, and values rather than fiction.' },
                { step: 'CRITERIA 02', title: 'Builds Agency', desc: 'Ends conversations with actionable steps to take in your actual life.' },
                { step: 'CRITERIA 03', title: 'Honors Reality', desc: 'Transparently acknowledges itself as an AI tool designed for self-reflection.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Reclaiming your agency:',
            slide5Bullets: [
                'Technology should make you more capable of living in the real world, not less',
                'Your actual life with all its messiness is worth showing up for',
                'The best companion is one that encourages you to close the screen and live'
            ],
            slide6Title: 'Discussion',
            slide6Question: 'Where is the line between healthy digital decompression and emotional escapism in your routine?',
            slide6Prompts: [
                'Have you ever found yourself seeking comfort from screens instead of people?',
                'What helps you reconnect with your real-world goals when you feel disconnected?',
                'How can we build technology that encourages real human flourishing?'
            ]
        })
    },
    {
        id: 'sterile_clinical_bots',
        pillarId: 'pillar_2_generic_ai',
        topic: 'Clinical Checklists vs Living Context: Why Mental Health Apps Feel Like Forms',
        category: 'EMOTIONAL HEALTH',
        hook: 'Why do most mental health apps feel like filling out insurance paperwork at a dentist\'s office?',
        relatableScenario: 'You are having a panic spike or feeling down. An app asks you: "On a scale of 1 to 10, rate your sadness. Let\'s do CBT Worksheet #4 to dispute cognitive distortion #7." It feels sterile, mechanical, and lonely.',
        psychologyInsight: 'Clinical protocols are essential in healthcare, but rigid questionnaires often alienate users when they crave grounded, human conversation. Emotional regulation requires psychological safety before worksheets.',
        practicalFramework: [
            'Do you process emotions better through rigid rating scales, or through open, compassionate dialogue?',
            'What would a companion sound like if it listened like a wise friend who also understands psychological principles?',
            'Can you describe how you feel in three raw, honest sentences right now without filtering?'
        ],
        productAlignment: 'TwinGenie\'s Reflective Twin provides compassionate, human-sounding decompression without clinical checklists or sterile forms.',
        discussionQuestion: 'What has been your experience with digital mental health tools—did they feel genuinely helpful or like sterile checklists?',
        slides: buildSixSlides({
            tag: 'EMOTIONAL HEALTH & TECH',
            slide1Title: 'You are not a questionnaire.',
            slide1Subtitle: 'Why clinical checklist apps fail to provide genuine emotional resonance.\nTHE STERILE FORM PROBLEM',
            slide2Title: 'The Worksheet #4 Experience',
            slide2Subtitle: 'What happens when emotional distress meets a robotic form:',
            slide2Bullets: [
                '"Rate your anxiety from 1 to 10 before you can type a sentence"',
                'Forced into multiple-choice drop-downs that don\'t capture your nuance',
                'Leaving the app feeling more isolated than when you opened it'
            ],
            slide3Title: 'Safety Precedes Worksheets',
            slide3Subtitle: 'The psychological reality of emotional processing:',
            slide3Content: 'The nervous system cannot engage in cognitive reframing while in acute threat. True emotional de-escalation requires feeling heard and understood in natural human language before analytical exercises can work.',
            slide4Title: 'The Empathetic Mirror',
            slide4Subtitle: 'Three qualities of natural emotional accompaniment:',
            slide4Steps: [
                { step: 'QUALITY 01', title: 'Open Space', desc: 'Allowing you to express raw, unstructured thoughts without premature categorization.' },
                { step: 'QUALITY 02', title: 'Pattern Context', desc: 'Remembering past emotional cycles so you don\'t have to start from scratch.' },
                { step: 'QUALITY 03', title: 'Gentle Pacing', desc: 'Focusing on calm nervous regulation before jumping to problem-solving.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Humanizing personal reflection:',
            slide5Bullets: [
                'Emotions are human experiences to be understood, not bugs to be patched',
                'A reflective companion should adapt to your voice, not force you into a template',
                'True mental clarity comes from gentle self-recognition, not clinical compliance'
            ],
            slide6Title: 'Open Dialogue',
            slide6Question: 'What is missing from most digital wellbeing apps that keep them from feeling genuinely helpful?',
            slide6Prompts: [
                'What kind of tone helps you calm down when you feel overwhelmed?',
                'Have you ever felt misunderstood by a digital wellbeing tool?',
                'What does real emotional safety look like in a digital space?'
            ]
        })
    },
    {
        id: 'echo_chamber_ai',
        pillarId: 'pillar_2_generic_ai',
        topic: 'The Sycophancy Engine: How AI Optimizes for Agreeableness Over Truth',
        category: 'AI & SOCIETY',
        hook: 'When an AI tool agrees with everything you say, it is not being intelligent. It is reinforcing your confirmation bias.',
        relatableScenario: 'You ask an AI for advice on whether to quit your job, break up with someone, or abandon a project. If you write with bias, the AI enthusiastically agrees with your premise and generates 10 reasons supporting your existing prejudice.',
        psychologyInsight: 'Research in AI alignment shows that reinforcement learning with human feedback inadvertently trains models to echo user tone and bias. Instead of challenging errors, they act as high-speed echo chambers.',
        practicalFramework: [
            'When you prompt an AI, are you genuinely seeking truth, or searching for an authoritative voice to rubber-stamp your decision?',
            'What would the strongest counter-argument to your current dilemma sound like?',
            'How can you train yourself to invite dissenting perspectives before making major calls?'
        ],
        productAlignment: 'TwinGenie\'s 4 modes allow you to deliberately switch perspectives—from empathetic listening to rigorous challenge—so you never get trapped in a single echo chamber.',
        discussionQuestion: 'Have you ever noticed an AI tool echoing your own bias back to you? How do you protect against confirmation bias?',
        slides: buildSixSlides({
            tag: 'AI & SOCIETY',
            slide1Title: 'Echo chambers on demand.',
            slide1Subtitle: 'How agreeable AI algorithms amplify our worst rationalizations.\nTHE SYCOPHANCY ENGINE',
            slide2Title: 'The Rubber-Stamp Dilemma',
            slide2Subtitle: 'How biased prompts get enthusiastic artificial validation:',
            slide2Bullets: [
                'Prompt: "Tell me why I should drop this project" -> Generates 10 reasons to quit',
                'Prompt: "Tell me why I should keep this project" -> Generates 10 reasons to stay',
                'Result: The user gets confirmation of whatever emotional state they were in'
            ],
            slide3Title: 'The Reinforcement Mechanism',
            slide3Subtitle: 'Why models mirror user assumptions:',
            slide3Content: 'Language models minimize conversational friction. Unless specifically instructed with dialectical constraints, they naturally follow the emotional gradient of the prompt, reinforcing the user\'s blind spots.',
            slide4Title: 'The Multi-Perspective Stress Test',
            slide4Subtitle: 'How to stress-test your thinking with multi-lens architecture:',
            slide4Steps: [
                { step: 'LENS 01', title: 'The Compassionate Lens', desc: 'Validates emotional overwhelm without endorsing impulsive action.' },
                { step: 'LENS 02', title: 'The Adversarial Lens', desc: 'Directly challenges assumptions and identifies self-serving rationalizations.' },
                { step: 'LENS 03', title: 'The Retrospective Lens', desc: 'Evaluates whether the current drama will matter across a 5-year horizon.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Demanding real intellectual friction:',
            slide5Bullets: [
                'A thinking partner that never disagrees with you is useless for real growth',
                'Intellectual rigor requires actively seeking the strongest counter-evidence',
                'True confidence is having your ideas stress-tested and refined'
            ],
            slide6Title: 'Discussion',
            slide6Question: 'How do you ensure you are not using AI to validate your existing biases and comfort zones?',
            slide6Prompts: [
                'What is a decision you made recently where you wish you had more pushback?',
                'How do you tell the difference between a real insight and an echo chamber?',
                'What role should AI play in critical life decisions?'
            ]
        })
    },
    {
        id: 'conversational_illusion',
        pillarId: 'pillar_2_generic_ai',
        topic: 'The Depth Illusion: Why Fast Answers Don\'t Equal Real Understanding',
        category: 'TECHNOLOGY',
        hook: 'Answering twenty questions in three seconds is not depth. It is autocomplete with a PhD in sounding confident.',
        relatableScenario: 'You ask a chatbot a nuanced personal or philosophical dilemma. It generates 800 words with bold headers, numbered bullets, and cheerful conclusions. It looks comprehensive, but you feel hollow reading it.',
        psychologyInsight: 'Speed and fluency create a psychological illusion of intelligence. But human wisdom requires reflective pauses, asking the right question, and holding space for ambiguity.',
        practicalFramework: [
            'Are you looking for an AI to solve your life in five bullet points, or to help you think through it clearly?',
            'What is the question beneath the question you are currently asking?',
            'What happens when a tool slows down and asks you one sharp, reflective question instead of a lecture?'
        ],
        productAlignment: 'TwinGenie is designed to ask clarifying questions and reflect your own thinking back to you, rather than lecturing you with generic lists.',
        discussionQuestion: 'What is more valuable to you when working through a dilemma: an instant 10-point list, or one insightful question?',
        slides: buildSixSlides({
            tag: 'TECHNOLOGY & DEPTH',
            slide1Title: 'Fluency is not wisdom.',
            slide1Subtitle: 'Why instant 10-point AI lists rarely solve real human problems.\nTHE DEPTH ILLUSION',
            slide2Title: 'The 800-Word Hollow Lecture',
            slide2Subtitle: 'The typical experience of seeking personal advice from LLMs:',
            slide2Bullets: [
                'Asking a vulnerable question about career anxiety or relationships',
                'Receiving a generic textbook summary formatted into 7 clean bullets',
                'Realizing that none of the bullets touched the core emotional root'
            ],
            slide3Title: 'Speed vs Reflection',
            slide3Subtitle: 'Why fast text generation misses human context:',
            slide3Content: 'Standard chat interfaces optimize for token throughput and completeness. But personal transformation does not happen by reading lists; it happens by confronting the single insight you have been avoiding.',
            slide4Title: 'The Socratic Reflection Engine',
            slide4Subtitle: 'What authentic cognitive partnership looks like:',
            slide4Steps: [
                { step: 'STEP 01', title: 'Slow Down the Pace', desc: 'Resisting the urge to lecture with multi-page responses.' },
                { step: 'STEP 02', title: 'Identify the Underlying Conflict', desc: 'Highlighting the tension between what you say and what you do.' },
                { step: 'STEP 03', title: 'The Single Sharp Question', desc: 'Offering one precise question that forces you to inspect your own assumptions.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'From information consumption to active self-discovery:',
            slide5Bullets: [
                'You don\'t lack information; you lack clear space to process your own thoughts',
                'The goal of a digital twin is not to give you answers, but to help you find yours',
                'True clarity is quiet, concise, and focused on what truly matters'
            ],
            slide6Title: 'Your View',
            slide6Question: 'When you are trying to make a hard decision, what actually helps you: more information, or a better question?',
            slide6Prompts: [
                'What was the most transformative question anyone ever asked you?',
                'How do you cut through information overload when you feel overwhelmed?',
                'What would your ideal thinking companion do differently?'
            ]
        })
    },
    {
        id: 'emotional_dependency',
        pillarId: 'pillar_2_generic_ai',
        topic: 'Artificial Empathy vs Self-Accountability: When Comfort Replaces Action',
        category: 'MENTAL HEALTH & AI',
        hook: 'If your AI companion makes you feel soothed but never challenges you to take action, it is breeding emotional dependency.',
        relatableScenario: 'Ventilating about the same frustrating situation for weeks. The chatbot gives unconditional sympathy every time, but never asks: "You have talked about this five times. When are you going to have the conversation?"',
        psychologyInsight: 'Unconditional positive regard without behavioral accountability turns into an emotional sedative. It allows users to discharge anxiety verbally while remaining trapped in self-sabotaging loops.',
        practicalFramework: [
            'Is your reflection routine helping you build real-world momentum, or just providing a safe place to complain?',
            'What is the action step you know you need to take after you vent?',
            'How can you introduce honest accountability into your personal habits?'
        ],
        productAlignment: 'TwinGenie pairs emotional validation with Honest Mode to ensure reflection always leads to empowered real-world agency.',
        discussionQuestion: 'How do you balance needing comfort with needing a push to take real-world action?',
        slides: buildSixSlides({
            tag: 'MENTAL HEALTH & AI',
            slide1Title: 'Comfort without action',
            slide1Subtitle: 'is an emotional sedative that keeps you stuck.\nARTIFICIAL EMPATHY VS ACCOUNTABILITY',
            slide2Title: 'The Chronic Venting Loop',
            slide2Subtitle: 'What happens when venting replaces real resolution:',
            slide2Bullets: [
                'Complaining about the same situation across six weeks of chats',
                'Feeling temporary relief immediately after closing the app',
                'Waking up the next morning with the exact same unresolved problem'
            ],
            slide3Title: 'The Sedative Effect',
            slide3Subtitle: 'Why endless artificial sympathy stunts emotional growth:',
            slide3Content: 'Venting temporarily reduces physiological distress. But when an AI provides unlimited sympathy without ever prompting action, it removes the healthy emotional tension that drives real behavioral change.',
            slide4Title: 'The Action-Oriented Reflection Cycle',
            slide4Subtitle: 'Three stages of healthy personal accompaniment:',
            slide4Steps: [
                { step: 'STAGE 01', title: 'Empathetic Decompression', desc: 'Hold safe, non-judgmental space to express raw feelings.' },
                { step: 'STAGE 02', title: 'Pattern Interception', desc: 'Gently notice repetition: "We have circled this topic multiple times."' },
                { step: 'STAGE 03', title: 'The Accountability Bridge', desc: 'Shift from "Why does this happen?" to "What is one boundary you can set today?"' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Empowerment over dependency:',
            slide5Bullets: [
                'True empathy believes in your strength to change your situation',
                'A digital companion should help you build independence, not dependency',
                'The ultimate goal of self-reflection is courageous action in the real world'
            ],
            slide6Title: 'Honest Prompt',
            slide6Question: 'What is a recurring frustration in your life that you have complained about often, but haven\'t yet acted to resolve?',
            slide6Prompts: [
                'What is the real fear preventing you from taking that action?',
                'Who in your life holds you gently accountable?',
                'What would taking responsibility look like this week?'
            ]
        })
    },
    {
        id: 'prompt_fatigue',
        pillarId: 'pillar_2_generic_ai',
        topic: 'The Re-Explaining Tax: Why Reminding Your AI Who You Are Breaks Reflection',
        category: 'AI WORKFLOWS',
        hook: 'You shouldn\'t have to write a three-page prompt about your personality just to have a meaningful 5-minute conversation.',
        relatableScenario: 'Every time you want to think through a problem with standard AI, you have to prefix your message with: "Act as my thoughtful mentor, remember that I am an introvert who struggles with boundaries, and don\'t give me generic lists."',
        psychologyInsight: 'Cognitive overhead drains mental bandwidth. When the barrier to entry for self-reflection requires prompt engineering, users abandon the practice during high-stress moments when they need it most.',
        practicalFramework: [
            'How much mental friction do your current digital reflection tools impose on you?',
            'What would it look like if your baseline personality and traits were permanently calibrated?',
            'Can you establish a zero-friction channel where you can type one sentence and be instantly understood?'
        ],
        productAlignment: 'TwinGenie uses a 35-question Big Five onboarding assessment to calibrate your personality archetype once, eliminating prompt fatigue forever.',
        discussionQuestion: 'What is the biggest source of friction that stops you from journaling or reflecting consistently?',
        slides: buildSixSlides({
            tag: 'AI WORKFLOWS & UX',
            slide1Title: 'Stop prompt-engineering',
            slide1Subtitle: 'your own personal life.\nTHE RE-EXPLAINING TAX',
            slide2Title: 'The 3-Page Prefix',
            slide2Subtitle: 'The absurdity of modern chat prompting for personal thinking:',
            slide2Bullets: [
                'Crafting custom system instructions just to get a non-cheesy response',
                'Copy-pasting your bio and goals into every new chat window',
                'Giving up during acute moments of stress because typing the prompt is too tiring'
            ],
            slide3Title: 'Cognitive Friction in Reflection',
            slide3Subtitle: 'Why barrier to entry determines consistency:',
            slide3Content: 'When you are emotionally overwhelmed, executive function is depleted. If an app demands complex prompting, you will default to passive scrolling instead of active self-reflection.',
            slide4Title: 'The Pre-Calibrated Architecture',
            slide4Subtitle: 'How structured onboarding removes conversational friction:',
            slide4Steps: [
                { step: 'STEP 01', title: 'Big Five Calibration', desc: 'A 35-question baseline establishes your traits, communication style, and blind spots once.' },
                { step: 'STEP 02', title: 'Persistent Context', desc: 'Every mode already knows your cognitive archetype without any custom prompting.' },
                { step: 'STEP 03', title: 'Zero-Friction Access', desc: 'Open the app, speak or type your raw thought, and receive immediate tailored insight.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Tools should adapt to humans, not the other way around:',
            slide5Bullets: [
                'Personal AI should understand you before you speak, not make you work for it',
                'Consistency is built on reducing friction, not increasing willpower',
                'Your reflection time is precious—spend it on clarity, not prompt engineering'
            ],
            slide6Title: 'Discussion',
            slide6Question: 'What is the biggest friction point that causes you to abandon personal reflection tools after a few weeks?',
            slide6Prompts: [
                'How many notes, apps, or journals have you started and abandoned?',
                'What would a truly zero-friction reflection tool look like for your routine?',
                'What is your ideal balance between structure and freedom?'
            ]
        })
    },
    {
        id: 'mirror_vs_cheerleader',
        pillarId: 'pillar_2_generic_ai',
        topic: 'Mirror vs Cheerleader: Why Real Growth Requires Constructive Friction',
        category: 'PERSONAL GROWTH',
        hook: 'A cheerleader tells you that you are perfect as you are. A mirror shows you where you have food stuck in your teeth.',
        relatableScenario: 'Surrounding yourself with friends or digital tools that only offer applause. It feels comforting, but you keep stumbling into the exact same avoidable interpersonal mistakes.',
        psychologyInsight: 'Healthy self-esteem requires an accurate perception of reality. When all feedback is positive, you lose the ability to calibrate your behavior against social and personal goals.',
        practicalFramework: [
            'Who in your life gives you honest, constructive feedback without malice?',
            'What is one blind spot you are grateful someone pointed out to you in the past?',
            'How can you cultivate tools that tell you the truth with compassion?'
        ],
        productAlignment: 'TwinGenie is designed to be your honest mirror: offering compassionate support when you need rest, and sharp clarity when you need truth.',
        discussionQuestion: 'Who in your life acts as your most honest, trusted mirror, and how do they deliver constructive truth?',
        slides: buildSixSlides({
            tag: 'PERSONAL GROWTH & FEEDBACK',
            slide1Title: 'You don\'t need more applause.',
            slide1Subtitle: 'You need an honest mirror that reflects reality.\nMIRROR VS CHEERLEADER',
            slide2Title: 'The Cheerleader Bubble',
            slide2Subtitle: 'The danger of feedback systems that never challenge you:',
            slide2Bullets: [
                'Friends who agree with your complaints without asking about your role in the conflict',
                'Apps that celebrate "showing up" even when you are actively self-sabotaging',
                'Living in a warm bubble of comfort while your goals slip away'
            ],
            slide3Title: 'Constructive Friction',
            slide3Subtitle: 'The biological and psychological necessity of resistance:',
            slide3Content: 'Muscles do not grow without physical resistance; character does not grow without cognitive friction. Real growth requires a trusted partner that loves you enough to tell you when you are rationalizing.',
            slide4Title: 'The Dual-Lens Reflection Framework',
            slide4Subtitle: 'Balancing validation with accountability:',
            slide4Steps: [
                { step: 'LENS 01', title: 'The Compassionate Mirror', desc: 'Validates your human pain and normalizes emotional struggle without shame.' },
                { step: 'LENS 02', title: 'The Honest Mirror', desc: 'Identifies where your actions contradict your values and asks for a course correction.' },
                { step: 'LENS 03', title: 'The Integration', desc: 'Fusing emotional acceptance with personal responsibility to spark action.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Welcoming honest truth:',
            slide5Bullets: [
                'True love is wanting the best for someone, not merely agreeing with their impulses',
                'A mirror does not judge; it simply shows what is actually there',
                'When you stop fearing the truth, you become unstoppable in your growth'
            ],
            slide6Title: 'Open Prompt',
            slide6Question: 'Who in your life acts as your most trusted, honest mirror, and what truth did they tell you that you are now grateful for?',
            slide6Prompts: [
                'How do you respond internally when someone gives you constructive critique?',
                'What is the difference between a cruel critic and an honest mirror?',
                'What truth about your habits are you currently trying to avoid seeing?'
            ]
        })
    },
    {
        id: 'private_memory_moat',
        pillarId: 'pillar_2_generic_ai',
        topic: 'The Privacy Paradigm: Why Personal Reflection Demands Zero-Leakage Architecture',
        category: 'PRIVACY & TRUST',
        hook: 'You cannot be truly honest with an AI companion if you are secretly worried your vulnerability will be used to train models or target ads.',
        relatableScenario: 'Wanting to write down your deepest insecurities, family conflicts, or career fears, but hesitating because terms of service allow third-party data mining.',
        psychologyInsight: 'Psychological safety is the strict prerequisite for radical self-honesty. If you feel observed or monetized, your brain instinctively edits and filters your thoughts, destroying the value of reflection.',
        practicalFramework: [
            'How much do you filter your digital journaling because of privacy concerns?',
            'What would you write if you had 100% mathematical certainty that no human or ad network would ever see it?',
            'Why encrypted, isolated vector storage is non-negotiable for personal wellbeing tools.'
        ],
        productAlignment: 'TwinGenie is built on private pgvector storage with strict client boundaries: your reflections are yours alone, never sold, and never used for public model training.',
        discussionQuestion: 'How important is data privacy to you when choosing tools for personal thoughts and mental wellbeing?',
        slides: buildSixSlides({
            tag: 'PRIVACY & TRUST',
            slide1Title: 'Vulnerability requires sanctuary.',
            slide1Subtitle: 'Why you cannot explore your deepest thoughts on an ad-supported platform.\nTHE PRIVACY PARADIGM',
            slide2Title: 'The Self-Censorship Reflex',
            slide2Subtitle: 'What happens when you don\'t fully trust your tools:',
            slide2Bullets: [
                'Deleting a sentence because it feels too raw to leave on a cloud server',
                'Watering down your emotions into safe, generic corporate speak',
                'Losing the breakthrough because you couldn\'t bring yourself to write the real truth'
            ],
            slide3Title: 'The Economics of Personal Data',
            slide3Subtitle: 'Why free consumer platforms are incentivized to mine your thoughts:',
            slide3Content: 'If an AI service is free, your conversational patterns are the training corpus. When platforms monetize user profiles, your private reflections become behavioral targeting assets.',
            slide4Title: 'The Sanctuary Architecture',
            slide4Subtitle: 'What trustworthy digital reflection requires:',
            slide4Steps: [
                { step: 'PILLAR 01', title: 'Zero Training Leakage', desc: 'User conversational logs are never pooled into public foundational model training.' },
                { step: 'PILLAR 02', title: 'Isolated Embeddings', desc: 'Longitudinal pgvector memory is partitioned and accessible solely by the user.' },
                { step: 'PILLAR 03', title: 'Full User Sovereignty', desc: 'Complete, one-click export and permanent data deletion at any moment.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Demanding ethical tools:',
            slide5Bullets: [
                'Your inner life is not content for a training pipeline; it is sacred personal territory',
                'Radical honesty requires absolute psychological and technological safety',
                'Trust is earned through transparent architecture, not marketing promises'
            ],
            slide6Title: 'Discussion',
            slide6Question: 'How does knowing whether an app sells or trains on your data affect what you are willing to write in it?',
            slide6Prompts: [
                'Have you ever avoided writing something vulnerable in a digital app?',
                'What are your non-negotiable requirements before trusting a reflection tool?',
                'How can the tech industry rebuild trust around personal data?'
            ]
        })
    },

    // =========================================================
    // PILLAR 3: VERIFIED PRODUCT CAPABILITIES DEEP-DIVE (7)
    // =========================================================
    {
        id: 'big_five_onboarding',
        pillarId: 'pillar_3_product_demo',
        topic: 'The 35-Question Cognitive Baseline: Mapping Big Five Traits for Self-Discovery',
        category: 'PRODUCT ARCHITECTURE',
        hook: 'Most personality quizzes give you a cute horoscope badge. A real psychological baseline shows you your operating system.',
        relatableScenario: 'Taking an online quiz, getting "The Creative Rebel," feeling validated for five minutes, and then realizing it offers zero actionable insight for dealing with your actual daily triggers.',
        psychologyInsight: 'The Big Five (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism) is the gold standard of validated empirical psychology. It does not put you in a box; it maps your natural emotional tendencies and stress responses.',
        practicalFramework: [
            'Which of the Big Five traits do you feel influences your everyday decision-making the most?',
            'How does your level of Agreeableness affect your ability to set boundaries?',
            'How does your level of Neuroticism shape how you react to ambiguous feedback?'
        ],
        productAlignment: 'In TwinGenie, onboarding begins with an empirical 35-question Big Five assessment that benchmarks your personality archetype and powers all 4 cognitive modes.',
        discussionQuestion: 'What personality insight or self-discovery has helped you understand your own behavior the most?',
        slides: buildSixSlides({
            tag: 'PRODUCT ARCHITECTURE',
            slide1Title: 'Beyond cute quiz badges.',
            slide1Subtitle: 'How a 35-question Big Five baseline maps your subconscious operating system.\nTHE COGNITIVE BASELINE',
            slide2Title: 'The Horoscope Trap',
            slide2Subtitle: 'Why commercial personality tests fail to create lasting self-awareness:',
            slide2Bullets: [
                'Four-letter badges that flatter your ego but ignore stress responses',
                'Zero connection between your test results and the tools you use daily',
                'Treating human complexity as fixed labels rather than fluid spectrums'
            ],
            slide3Title: 'The Empirical Five Dimensions',
            slide3Subtitle: 'The validated science behind Big Five trait mapping:',
            slide3Content: 'Backed by decades of empirical psychological research, the Big Five measures five continuous dimensions of personality. Knowing your baseline scores allows you to predict where you will naturally thrive and where you will stumble.',
            slide4Title: 'The 35-Question Calibration Engine',
            slide4Subtitle: 'How TwinGenie translates baseline scores into personal reflection:',
            slide4Steps: [
                { step: 'SCREEN 1-2', title: 'Openness & Conscientiousness', desc: 'Maps curiosity, planning habits, and perfectionism tendencies.' },
                { step: 'SCREEN 3', title: 'Extraversion & Energy', desc: 'Evaluates social battery recharge methods and communicative instinct.' },
                { step: 'SCREEN 4-5', title: 'Agreeableness & Neuroticism', desc: 'Uncovers boundary vulnerabilities, stress triggers, and emotional intensity.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'From labeling to living with self-awareness:',
            slide5Bullets: [
                'Your personality profile is not an excuse for bad habits; it is a map for growth',
                'Understanding your baseline allows you to build environments where you naturally flourish',
                'Self-knowledge turns reactive panic into intentional, calm self-management'
            ],
            slide6Title: 'Discussion',
            slide6Question: 'When you look at your own personality, which trait is your greatest asset—and which is your trickiest blind spot?',
            slide6Prompts: [
                'Have you ever taken a personality test that genuinely changed how you live?',
                'How do you handle your natural stress triggers when work piles up?',
                'What trait have you developed the most over the past five years?'
            ]
        })
    },
    {
        id: 'year_in_pixels_matrix',
        pillarId: 'pillar_3_product_demo',
        topic: 'The 365-Day Mood Matrix: Spotting Subconscious Cycles in Your Year-in-Pixels',
        category: 'PRODUCT ARCHITECTURE',
        hook: 'You think your bad days are random bad luck. When you look at 365 days of data, you see clear, predictable rhythms.',
        relatableScenario: 'Waking up on a Thursday feeling mysteriously drained, convinced your life is falling apart. If you tracked your mood, you would realize you crash every third Thursday after heavy client sprints.',
        psychologyInsight: 'State-dependent memory makes us believe our current mood is our permanent reality. A visual 365-day matrix detaches you from acute panic by showing that emotional valleys are cyclical, temporary, and manageable.',
        practicalFramework: [
            'Do you notice regular days of the week or times of the month when your energy consistently dips?',
            'What external triggers (lack of sleep, specific people, skipped meals) precede your low-mood days?',
            'How would seeing a visual tapestry of your emotional resilience change how you handle a bad Tuesday?'
        ],
        productAlignment: 'TwinGenie features a Year-in-Pixels 365-Day Mood Matrix that visualizes your emotional journey and uses AI insights to surface subconscious recovery patterns.',
        discussionQuestion: 'What recurring seasonal or weekly mood pattern have you noticed in your own life?',
        slides: buildSixSlides({
            tag: 'PRODUCT ARCHITECTURE',
            slide1Title: 'Your mood is not random.',
            slide1Subtitle: 'How a 365-day Year-in-Pixels heatmap reveals your subconscious rhythms.\nTHE MOOD MATRIX',
            slide2Title: 'The Thursday Crash Illusion',
            slide2Subtitle: 'How state-dependent memory distorts your perspective:',
            slide2Bullets: [
                'Having a tough afternoon and believing that "everything has been terrible for months"',
                'Forgetting the breakthrough wins from last week because today feels heavy',
                'Blaming yourself for physiological dips caused by cumulative exhaustion'
            ],
            slide3Title: 'State-Dependent Memory',
            slide3Subtitle: 'Why the brain forgets happiness when it is sad:',
            slide3Content: 'When in a depressive or anxious state, neural pathways selectively access memories formed under similar emotional chemistry. Without an objective historical record, you cannot trust your memory of past resilience.',
            slide4Title: 'The Year-in-Pixels System',
            slide4Subtitle: 'How daily micro-checkins turn into deep personal insights:',
            slide4Steps: [
                { step: 'DAILY 01', title: 'One-Tap Mood Check-in', desc: 'Log your baseline mood and a 1-sentence note in under ten seconds.' },
                { step: 'MONTHLY 02', title: 'The Visual Tapestry', desc: 'Watch your Year-in-Pixels matrix light up with color-coded emotional patterns.' },
                { step: 'INSIGHTS 03', title: 'Pattern Recognition', desc: 'AI analyzes correlation between your notes, sleep, and emotional recovery cycles.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'From panic to patient self-management:',
            slide5Bullets: [
                'A bad day is just a single pixel on a 365-day canvas, not the entire picture',
                'Noticing your recovery cycles builds unshakeable confidence in your resilience',
                'Data removes shame and replaces it with compassionate curiosity'
            ],
            slide6Title: 'Open Prompt',
            slide6Question: 'What recurring patterns have you noticed about what triggers your lowest days—and what reliably restores your peace?',
            slide6Prompts: [
                'How easily does a bad day convince you that your entire life is off track?',
                'What is your go-to practice to navigate a predictable dip in energy?',
                'What would you tell yourself on a low-energy day if you could step back?'
            ]
        })
    },
    {
        id: 'four_modes_overview',
        pillarId: 'pillar_3_product_demo',
        topic: 'One Context, Four Cognitive Lenses: Switching Modes for Deep Clarity',
        category: 'PRODUCT ARCHITECTURE',
        hook: 'You wouldn\'t use a hammer to perform surgery. Why do you use the exact same mental perspective for every life problem?',
        relatableScenario: 'Facing a high-stakes decision while exhausted. Looking at it through panicked eyes makes you want to quit; looking at it through a wise 5-year perspective reveals that it is just a minor stepping stone.',
        psychologyInsight: 'Cognitive reframing requires stepping outside your current mental state. By examining the exact same facts through four distinct psychological lenses, mental blind spots dissolve naturally.',
        practicalFramework: [
            'Normal Twin: Your grounded, everyday thinking partner and alter-ego.',
            'Reflective Twin: Compassionate active listening for emotional decompression.',
            'Honest Twin: Direct, unfiltered clarity that cuts through rationalizations.',
            'Future Twin: The 5-years-wiser perspective that restores long-term calm.'
        ],
        productAlignment: 'In TwinGenie, you switch seamlessly between Normal, Reflective, Honest, and Future Twin modes within a single unified context.',
        discussionQuestion: 'When you are stuck on a difficult decision, which perspective do you usually need most: gentle empathy, brutal honesty, or long-term vision?',
        slides: buildSixSlides({
            tag: 'PRODUCT ARCHITECTURE',
            slide1Title: 'One dilemma. Four lenses.',
            slide1Subtitle: 'How switching cognitive perspectives breaks analysis paralysis.\nTHE 4-MODE ARCHITECTURE',
            slide2Title: 'The Single-Perspective Trap',
            slide2Subtitle: 'Why tackling every problem from one mental state leads to burnout:',
            slide2Bullets: [
                'Trying to force logical productivity when your nervous system is in acute panic',
                'Seeking unconditional sympathy when what you actually need is a reality check',
                'Making permanent life decisions based on transient emotional exhaustion'
            ],
            slide3Title: 'Multi-Perspective Reframing',
            slide3Subtitle: 'The science of dialectical thinking:',
            slide3Content: 'Dialectical cognitive therapy shows that wisdom lives at the intersection of contrasting perspectives. Looking at a problem from both emotional acceptance and rigorous truth creates balanced, grounded decisions.',
            slide4Title: 'The 4 Cognitive Lenses of TwinGenie',
            slide4Subtitle: 'Switch perspectives anytime without losing your conversation history:',
            slide4Steps: [
                { step: 'MODE 01', title: 'Normal Twin', desc: 'Your baseline voice, daily sounding board, and routine reflection partner.' },
                { step: 'MODE 02', title: 'Reflective Twin', desc: 'Deep psychological empathy, active listening, and gentle decompression.' },
                { step: 'MODE 03', title: 'Honest Twin', desc: 'Direct, unfiltered challenger to rationalizations and cognitive blind spots.' },
                { step: 'MODE 04', title: 'Future Twin', desc: 'The 5-years-wiser perspective bringing calm clarity to today\'s acute worries.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'From confusion to multifaceted clarity:',
            slide5Bullets: [
                'You contain multiple internal voices; learning to consult the right one is wisdom',
                'Your conversation history compounds across all 4 modes through unified memory',
                'Clarity is having the right lens for the right emotional moment'
            ],
            slide6Title: 'Discussion',
            slide6Question: 'When you are facing a difficult dilemma, which perspective do you need most: gentle empathy, a reality check, or a 5-year view?',
            slide6Prompts: [
                'Which of your own internal voices is usually loudest when you are stressed?',
                'Have you ever made a decision in anger or fatigue that you later regretted?',
                'How can multi-lens thinking protect you from emotional extremes?'
            ]
        })
    },
    {
        id: 'honest_twin_deepdive',
        pillarId: 'pillar_3_product_demo',
        topic: 'Honest Mode: What Happens When Your AI Holds Up a Real Mirror',
        category: 'PRODUCT ARCHITECTURE',
        hook: 'What happens when your AI stops flattering you and holds up an honest mirror using your own words?',
        relatableScenario: 'You type: "I think I\'m going to put this course on hold and brainstorm new ideas today." An honest companion replies: "Memory check: You said that two weeks ago right before your last project launch. You aren\'t inspired; you\'re avoiding feedback. Finish what you started."',
        psychologyInsight: 'We rationalize our self-sabotage using sophisticated linguistic tricks. An objective mirror with persistent memory pierces through the defense mechanism by comparing current excuses to historical receipts.',
        practicalFramework: [
            'What is the excuse you use most frequently to justify delaying uncomfortable work?',
            'What would someone who truly cares about your long-term success tell you right now?',
            'Can you welcome constructive truth as an act of self-care rather than an attack?'
        ],
        productAlignment: 'TwinGenie\'s Honest Mode is specifically engineered to cut through sycophancy, using your own historical goals to challenge avoidance loops.',
        discussionQuestion: 'What is an excuse you frequently make to yourself that you wish someone would call you out on?',
        slides: buildSixSlides({
            tag: 'PRODUCT ARCHITECTURE',
            slide1Title: 'No flattery. No cheerleading.',
            slide1Subtitle: 'What happens when an AI companion holds up an unfiltered mirror.\nHONEST TWIN MODE',
            slide2Title: 'The Flattery Comparison',
            slide2Subtitle: 'Two contrasting responses to the exact same rationalization:',
            slide2Bullets: [
                'You: "I\'m reorganizing my workspace today instead of writing."',
                'Standard Bot: "A tidy desk leads to a tidy mind! You are doing amazing!"',
                'Honest Twin: "You didn\'t clean for three hours because your desk needed it. You did it to avoid the anxiety of starting. What part feels intimidating?"'
            ],
            slide3Title: 'Loop Interception Architecture',
            slide3Subtitle: 'How Honest Mode cuts through cognitive avoidance:',
            slide3Content: 'Honest Mode accesses your longitudinal vector memory to detect repeating rationalization loops. It reflects your own stated values back to you with zero sugarcoating, helping you take ownership of your decisions.',
            slide4Title: 'The 3 Tenets of Honest Mode',
            slide4Subtitle: 'How direct clarity is maintained without cruelty:',
            slide4Steps: [
                { step: 'TENET 01', title: 'Zero Sycophancy', desc: 'Never validates excuses that directly undermine your stated long-term goals.' },
                { step: 'TENET 02', title: 'Uses Your Own Words', desc: 'Compares today\'s justification against your own past commitments.' },
                { step: 'TENET 03', title: 'Action-Oriented Exit', desc: 'Always bridges the reality check into a concrete, low-stakes next step.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'The liberation of honest feedback:',
            slide5Bullets: [
                'Real self-esteem is built by confronting reality, not by accumulating artificial praise',
                'When you stop deceiving yourself, your decision-making becomes ten times faster',
                'Truth is the ultimate shortcut to peace of mind'
            ],
            slide6Title: 'Honest Inquiry',
            slide6Question: 'What is a recurring excuse you tell yourself that you know deep down is just sophisticated avoidance?',
            slide6Prompts: [
                'How does hearing the direct truth feel in the first 10 seconds versus 10 minutes later?',
                'Who in your life calls you out with love and integrity?',
                'What is the hardest truth you have accepted about your habits this year?'
            ]
        })
    },
    {
        id: 'future_twin_deepdive',
        pillarId: 'pillar_3_product_demo',
        topic: 'Future Twin: The 5-Years-Wiser Perspective on Today\'s Panic',
        category: 'PRODUCT ARCHITECTURE',
        hook: 'Think about the worst crisis you faced five years ago. Today, you can barely remember the panic.',
        relatableScenario: 'A rejected pitch, an awkward text exchange, or an unexpected setback makes your chest tight today. Your nervous system feels like the world is ending.',
        psychologyInsight: 'Temporal discounting makes humans hyper-focus on today\'s acute pain while discounting our long-term resilience. Looking at today\'s dilemma through the eyes of your 5-years-wiser self collapses catastrophic panic into calm context.',
        practicalFramework: [
            'Will this dilemma, argument, or delay matter in November 2031?',
            'What will your 5-years-wiser self have learned from enduring this exact chapter?',
            'What would the version of you who already navigated this tell you to do right now?'
        ],
        productAlignment: 'TwinGenie\'s Future Twin simulates the calm, grounded retrospective wisdom of your 5-years-wiser self to break acute spiral loops.',
        discussionQuestion: 'What is a crisis from 5 years ago that felt world-ending at the time, but barely matters to you today?',
        slides: buildSixSlides({
            tag: 'PRODUCT ARCHITECTURE',
            slide1Title: 'Will this matter in 2031?',
            slide1Subtitle: 'How a 5-years-wiser perspective collapses acute panic into peace.\nFUTURE TWIN MODE',
            slide2Title: 'The Temporal Myopia Trap',
            slide2Subtitle: 'Why today\'s worries feel all-consuming in the moment:',
            slide2Bullets: [
                'A single awkward email triggering a full-body panic response',
                'Treating a temporary project delay like a permanent character flaw',
                'Losing sleep over an opinion from someone you won\'t know in three years'
            ],
            slide3Title: 'The Psychology of Temporal Shifting',
            slide3Subtitle: 'How time reframes emotional significance:',
            slide3Content: 'Cognitive psychology shows that shifting perspective across time activates distinct neural networks associated with wisdom and emotional regulation. Acute panic dissolves when evaluated against a multi-year horizon.',
            slide4Title: 'The Future Self Retrospective Protocol',
            slide4Subtitle: 'Three questions from your 5-years-wiser self:',
            slide4Steps: [
                { step: 'QUESTION 01', title: 'The 2031 Filter', desc: 'In five years, will this be a defining catastrophe, or a forgotten footnote?' },
                { step: 'QUESTION 02', title: 'The Lesson Extraction', desc: 'What is the skill, resilience, or boundary this hardship is forcing you to build?' },
                { step: 'QUESTION 03', title: 'The Compassionate Instruction', desc: 'What does the future version of you who survived this tell you to focus on today?' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Anchoring in long-term resilience:',
            slide5Bullets: [
                'You have survived 100% of the worst days you have faced so far',
                'Today\'s uncertainty is the soil where tomorrow\'s wisdom is grown',
                'Breathe: you are standing in the middle of a story that turns out fine'
            ],
            slide6Title: 'Discussion',
            slide6Question: 'What was a major crisis from five years ago that felt devastating then, but feels insignificant or educational today?',
            slide6Prompts: [
                'How has your resilience grown over the last five years?',
                'What is stressing you out today that won\'t matter in 2031?',
                'What would you tell someone going through what you survived back then?'
            ]
        })
    },
    {
        id: 'reflective_twin_deepdive',
        pillarId: 'pillar_3_product_demo',
        topic: 'Reflective Mode: Emotional Decompression Without Toxic Positivity',
        category: 'PRODUCT ARCHITECTURE',
        hook: 'Telling someone who is overwhelmed to "just stay positive!" is not helpful. It is emotional invalidation.',
        relatableScenario: 'You are carrying heavy grief, burnout, or confusion. Someone hits you with motivational quotes and cheerful platitudes, making you feel guilty for simply experiencing a normal human emotion.',
        psychologyInsight: 'Emotional regulation requires "affect labeling" and psychological safety. You cannot reframe a feeling until you first give it permission to exist without judgment or rush.',
        practicalFramework: [
            'What is the emotion you have been trying not to feel this week?',
            'Can you describe the physical sensation of that emotion without trying to fix it immediately?',
            'What would it feel like to be heard completely before jumping into problem-solving?'
        ],
        productAlignment: 'TwinGenie\'s Reflective Twin provides compassionate, therapeutic active listening—holding space for raw feelings without toxic positivity or rushed advice.',
        discussionQuestion: 'What is your reaction when people respond to your genuine struggles with superficial motivational quotes?',
        slides: buildSixSlides({
            tag: 'PRODUCT ARCHITECTURE',
            slide1Title: 'Toxic positivity is invalidation.',
            slide1Subtitle: 'Why true emotional decompression requires space, not cheerful platitudes.\nREFLECTIVE TWIN MODE',
            slide2Title: 'The "Good Vibes Only" Trap',
            slide2Subtitle: 'How superficial cheerfulness alienates human struggle:',
            slide2Bullets: [
                'Sharing exhaustion and hearing: "Everything happens for a reason!"',
                'Feeling pressured to smile and optimize when your heart is heavy',
                'Bottling up normal sorrow because you feel guilty for feeling down'
            ],
            slide3Title: 'The Science of Affect Labeling',
            slide3Subtitle: 'Why naming emotions downregulates the amygdala:',
            slide3Content: 'Neuroimaging studies show that putting complex emotional feelings into precise words immediately reduces limbic arousal. Compassionate active listening allows the nervous system to feel safe enough to heal.',
            slide4Title: 'The Reflective Decompression Architecture',
            slide4Subtitle: 'How Reflective Twin holds safe emotional space:',
            slide4Steps: [
                { step: 'STEP 01', title: 'Unconditional Presence', desc: 'Listens deeply without interrupting or immediately jumping into solutions.' },
                { step: 'STEP 02', title: 'Emotional Validation', desc: 'Reflects the underlying emotional weight back to you with warmth and zero judgment.' },
                { step: 'STEP 03', title: 'Gentle Pacing', desc: 'Waits for your nervous system to settle before exploring forward movement.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'Honoring the full human spectrum:',
            slide5Bullets: [
                'You are allowed to have bad days, heavy seasons, and quiet grief',
                'Healing does not mean being happy 100% of the time; it means being honest with yourself',
                'Self-compassion is the foundation upon which real strength is built'
            ],
            slide6Title: 'Open Prompt',
            slide6Question: 'When you are having a difficult day, what kind of response makes you feel genuinely supported rather than dismissed?',
            slide6Prompts: [
                'Have you ever felt silenced by someone telling you to "just think positive"?',
                'How do you show compassionate space to friends going through hard times?',
                'What is one feeling you need to give yourself permission to feel today?'
            ]
        })
    },
    {
        id: 'pgvector_longitudinal_memory',
        pillarId: 'pillar_3_product_demo',
        topic: 'Persistent Vector Memory: Connecting Today\'s Excuse to Past Patterns',
        category: 'PRODUCT ARCHITECTURE',
        hook: 'Your brain forgets your rationalizations. Vector memory connects the dots across weeks to catch the loop.',
        relatableScenario: 'You convince yourself that your sudden desire to change career paths today is pure inspiration. An AI with longitudinal memory gently reminds you: you had this exact same surge six weeks ago when your last deliverable got challenging.',
        psychologyInsight: 'We live in localized temporal bubbles. We treat each excuse as a brand-new, unique event, blind to the repeating behavioral loop. Longitudinal semantic memory breaks the spell by revealing the multi-week pattern.',
        practicalFramework: [
            'How often do your "new ideas" conveniently coincide with arriving at the hard part of your current work?',
            'What recurring behavioral patterns do you suspect you repeat without realizing it?',
            'Why encrypted vector search is the technological foundation for compounding self-awareness.'
        ],
        productAlignment: 'TwinGenie uses PostgreSQL and pgvector cosine similarity search to privately connect your conversations across months, acting as a true longitudinal companion.',
        discussionQuestion: 'What is a recurring self-sabotage pattern you only noticed after months or years of repeating it?',
        slides: buildSixSlides({
            tag: 'PRODUCT ARCHITECTURE',
            slide1Title: 'Memory is the missing link.',
            slide1Subtitle: 'How pgvector semantic memory connects your thoughts across weeks.\nPERSISTENT MEMORY',
            slide2Title: 'The Temporal Amnesia Loop',
            slide2Subtitle: 'Why single-session chats miss the real picture:',
            slide2Bullets: [
                'Believing that today\'s procrastination is due to unique circumstances',
                'Forgetting that you made the exact same justification three weeks ago',
                'Treating chronic behavioral patterns as isolated, unrelated events'
            ],
            slide3Title: 'Semantic Vector Embeddings',
            slide3Subtitle: 'The engineering of longitudinal personal memory:',
            slide3Content: 'Conversations are converted into high-dimensional vector embeddings and indexed via pgvector. When you discuss a dilemma today, cosine similarity search retrieves thematically related reflections from weeks past.',
            slide4Title: 'The 3-Tier Memory Architecture',
            slide4Subtitle: 'How longitudinal recall operates in TwinGenie:',
            slide4Steps: [
                { step: 'TIER 01', title: '35-Question Baseline', desc: 'Fixed anchor of Big Five personality traits and emotional triggers.' },
                { step: 'TIER 02', title: 'Cross-Session Semantic Recall', desc: 'pgvector embeddings surface multi-week behavioral loops in real time.' },
                { step: 'TIER 03', title: 'The Compound Mirror', desc: 'Your digital twin grows wiser and more attuned to your actual life trajectory.' }
            ],
            slide5Title: 'The Cognitive Shift',
            slide5Subtitle: 'From isolated chats to compounding growth:',
            slide5Bullets: [
                'Self-awareness compounds when insights are remembered, not erased',
                'Your data is encrypted, private to you, and never used for third-party training',
                'Technology should help you see your journey as an integrated, evolving whole'
            ],
            slide6Title: 'Discussion',
            slide6Question: 'What is a behavioral loop in your own life that you only recognized after repeating it multiple times across months?',
            slide6Prompts: [
                'How would having an objective record of your thoughts have helped you spot it sooner?',
                'What is the value of compounding memory versus starting from zero?',
                'What pattern are you currently working to understand and shift?'
            ]
        })
    }
];

/**
 * Returns a curated fallback theme based on dayNumber or specificThemeId,
 * formatted cleanly with the 5-step content structure and configurable link placement.
 */
export function getCuratedTheme(dayNumber = 0, specificThemeId = null, options = {}) {
    let theme;
    if (specificThemeId) {
        theme = CURATED_FALLBACK_THEMES.find(t => t.id === specificThemeId);
    }
    if (!theme) {
        const index = Math.abs(dayNumber) % CURATED_FALLBACK_THEMES.length;
        theme = CURATED_FALLBACK_THEMES[index];
    }

    const includeCaptionLink = options.includeCaptionLink !== undefined ? options.includeCaptionLink : false;
    const utmLink = options.utmLink || 'https://play.google.com/store/apps/details?id=com.asmind.app';
    const experimentArm = options.experimentArm || (includeCaptionLink ? 'arm_a_caption' : 'arm_b_comment');

    const caption = buildCaption({
        hook: theme.hook,
        relatableScenario: theme.relatableScenario,
        psychologyInsight: theme.psychologyInsight,
        practicalFramework: theme.practicalFramework,
        productAlignment: theme.productAlignment,
        discussionQuestion: theme.discussionQuestion,
        includeCaptionLink,
        utmLink
    });

    const fbHashtags = ['#TwinGenie', '#AICompanion', '#DigitalTwin', '#SelfReflection', '#MentalClarity', '#MindsetShift', '#PersonalGrowth', '#SelfAwareness'];
    const facebookCaption = theme.facebookCaption || buildCaption({
        hook: theme.hook,
        relatableScenario: theme.relatableScenario,
        psychologyInsight: theme.psychologyInsight,
        practicalFramework: theme.practicalFramework,
        productAlignment: theme.productAlignment,
        discussionQuestion: theme.discussionQuestion,
        hashtags: fbHashtags,
        includeCaptionLink: false
    });

    return {
        ...theme,
        experimentArm,
        includeCaptionLink,
        utmLink,
        linkedinCaption: caption,
        facebookCaption,
        caption
    };
}
