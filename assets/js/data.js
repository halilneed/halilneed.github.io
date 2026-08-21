/* ============================================================================
   hailneed.github.io — the parts that change often
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
    name: 'hailneed',
    handle: 'hailneed',
    github: 'https://github.com/hailneed',
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
      title: "My CLAUDE.md is seven lines long. It loads 137.",
      dek:
        "Instruction files are read before every question you ask, and nobody " +
        "measures them. Twelve projects, a median of ~6,000 tokens per request, " +
        "and the rule that turned out to be working precisely because it never fired.",
      status: "planned",
      tags: ["claude-code", "agents", "context"],
      date: null,
      readingTime: null,
      url: null
    },
    {
      title: 'I read my Claude Code history: 300 prompts, 10,594 tool calls.',
      dek:
        'Claude Code writes every session to your disk as JSONL. Reading mine: ' +
        '35 tool calls per prompt, 49 denials, and the parts that did not flatter me.',
      status: 'planned',
      tags: ['claude-code', 'agents'],
      date: null,
      readingTime: null,
      url: null
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
    { id: 'fieldkit', label: 'Field kit',    n: '01' },
    { id: 'install',  label: 'Install',      n: '02' },
    { id: 'shipped',  label: 'Also shipped', n: '03' },
    { id: 'method',   label: 'Method',       n: '04' },
    { id: 'writing',  label: 'Dispatches',   n: '05' },
    { id: 'contact',  label: 'Contact',      n: '06' }
  ];

  return { profile: profile, writing: writing, sections: sections };
})();
