/* ============================================================================
   halilneed.github.io — the parts that change often
   ----------------------------------------------------------------------------
   Projects live in index.html as static markup: they change rarely, and the
   page must read correctly with JavaScript switched off.

   Dispatches live HERE, because they change every time something is published.
   Adding a Medium article is one object in HN.writing — nothing else. Both the
   home page and /writing/ read from this list. See WRITING.md.

   No build step: this is a plain script that hangs one object off `window`, so
   the site also works when opened straight from the filesystem.
   ========================================================================== */

window.HN = (function () {
  'use strict';

  /* -- links used in more than one place ---------------------------------- */
  var profile = {
    name: 'halilneed',
    handle: 'halilneed',
    github: 'https://github.com/halilneed',
    huggingface: 'https://huggingface.co/halilneed',
    /* TODO: swap for the real Medium profile once the first piece is live. */
    medium: 'https://medium.com/@hailneed',
    email: 'hqclox43@gmail.com'
  };

  /* =========================================================================
     DISPATCHES
     -------------------------------------------------------------------------
     Newest first. Two shapes:

       published — needs `url` and `date` (YYYY-MM-DD). Renders as a link.
       planned   — no url, no date. Renders as "in the works", not clickable.

     Fields:
       title       required
       dek         one or two sentences, shown under the title
       status      'published' | 'planned'
       tags        lowercase, used by the filter on /writing/
       date        'YYYY-MM-DD' for published pieces
       readingTime integer minutes, optional
       url         canonical Medium URL for published pieces
     ======================================================================= */
  var writing = [
    {
      title: 'Daha büyük model eğitmedim, zayıf dilimleri eğittim',
      dek:
        'In Turkish. How a 270M Turkish PII masking model went from 0.740 to ' +
        '0.882 on a public 1,000-row benchmark with 24,000 targeted examples — ' +
        'and the two slices where it got worse.',
      status: 'published',
      tags: ['turkish-nlp', 'privacy', 'models'],
      date: '2026-09-28',
      readingTime: null,
      url: 'https://hailneed.medium.com/daha-b%C3%BCy%C3%BCk-model-e%C4%9Fitmedim-zay%C4%B1f-dilimleri-e%C4%9Fittim-f4dcc4afaf5d'
    },
    {
      title: 'From first prompt to team workflows: an AI productivity roadmap for corporate teams',
      dek:
        'A crawl-walk-run guide for every team in a large company, not just the ' +
        'technical ones. One team cut its daily incoming requests from 100 to 35 ' +
        'without buying a single AI tool — by charting its own data first.',
      status: 'published',
      tags: ['ai-adoption', 'productivity'],
      date: '2026-09-13',
      readingTime: null,
      url: 'https://hailneed.medium.com/from-first-prompt-to-team-workflows-an-ai-productivity-roadmap-for-corporate-teams-761839e2c265'
    },
    {
      title: "I have 38 agent skills. Ten of them have never fired.",
      dek:
        "Claude Code writes down which skill was active on every tool call. " +
        "128 sessions, 376 activations, six skills doing all the work — and " +
        "1,447 lines of instructions no agent has ever opened.",
      status: "published",
      tags: ["claude-code", "agents", "developer-tools"],
      date: "2026-08-26",
      readingTime: null,
      url: "https://hailneed.medium.com/i-have-38-agent-skills-ten-of-them-have-never-fired-6e908ee56a35"
    },
    {
      title: "My CLAUDE.md is seven lines long. It loads 137.",
      dek:
        "Instruction files are read before every question you ask, and nobody " +
        "measures them. Twelve projects, a median of ~6,000 tokens per request, " +
        "and the rule that turned out to be working precisely because it never fired.",
      status: "published",
      tags: ["claude-code", "agents", "context"],
      date: "2026-08-21",
      readingTime: null,
      url: "https://hailneed.medium.com/instruction-files-are-read-before-every-question-you-ask-and-nobody-measures-them-c56b7989d12b"
    },
    {
      title: 'I read my Claude Code history: 300 prompts, 10,594 tool calls.',
      dek:
        'Claude Code writes every session to your disk as JSONL. Reading mine: ' +
        '35 tool calls per prompt, 49 denials, and the parts that did not flatter me.',
      status: 'published',
      tags: ['claude-code', 'agents'],
      date: '2026-08-20',
      readingTime: 7,
      url: 'https://medium.com/@hailneed/i-read-my-claude-code-history-300-prompts-10-594-tool-calls-a1524399d5a9'
    },
    {
      title: 'Your agent says it fixed it. Here is how to check.',
      dek:
        'Coding agents narrate their own work. The session log on your disk ' +
        'does not. Reading one against the other, turn by turn.',
      status: 'planned',
      tags: ['agents', 'observability'],
      date: null,
      readingTime: null,
      url: null
    },
    {
      title: '26 rules, no model: auditing what a coding agent was allowed to run',
      dek:
        'Why the risk layer in agent-blackbox is a readable pattern list ' +
        'instead of a model judgement, and where that trade-off hurts.',
      status: 'planned',
      tags: ['security', 'claude-code'],
      date: null,
      readingTime: null,
      url: null
    },
    {
      title: 'Complaints are a market signal. Revenue is the proof.',
      dek:
        'Building painradar taught me that pain without money evidence is ' +
        'a blog post, not a business. Here is the scoring that survived.',
      status: 'planned',
      tags: ['research', 'indie-hacker'],
      date: null,
      readingTime: null,
      url: null
    }
  ];

  /* -- the scroll rail on the home page ----------------------------------- */
  var sections = [
    { id: 'index',    label: 'Index',        n: '00' },
    { id: 'models',   label: 'Models',       n: '01' },
    { id: 'fieldkit', label: 'Field kit',    n: '02' },
    { id: 'install',  label: 'Install',      n: '03' },
    { id: 'support',  label: 'Support',      n: '04' },
    { id: 'shipped',  label: 'Also shipped', n: '05' },
    { id: 'method',   label: 'Method',       n: '06' },
    { id: 'writing',  label: 'Dispatches',   n: '07' },
    { id: 'faq',      label: 'FAQ',          n: '08' },
    { id: 'contact',  label: 'Contact',      n: '09' }
  ];

  return { profile: profile, writing: writing, sections: sections };
})();
