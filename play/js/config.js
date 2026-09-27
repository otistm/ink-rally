/* =====================================================================
   Ink Rally settings. This is the only file you normally need to touch by hand.
   ===================================================================== */
"use strict";
// Shown on the stages screen. Bump it with every change you ship.
const VERSION = '0.7.0';
// Online play (ghost drivers and leaderboards). This is the same Supabase project as Ink Nine; Ink Rally uses its own
// table, rally_runs. The key is the public "publishable" one and is safe to ship. Leave both empty to play offline.
const SUPABASE_URL = 'https://nzysakunytcbkzdfvhxk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NPelxkSP0WMLFZBMeMSQNA_5sW7dDgO';
