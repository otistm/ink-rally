-- Ink Rally: online play table (ghost drivers and leaderboards).
-- Paste this whole file into Supabase > SQL Editor and press Run. It's the same project as Ink Nine,
-- and it only adds a new table: nothing of Ink Nine's is touched.

create table if not exists public.rally_runs (
  player_id  uuid        not null default auth.uid() references auth.users on delete cascade,
  stage      text        not null,
  rev        int         not null default 1,     -- the stage layout the run was driven on
  grp        text        not null default '',    -- group code; '' is the open group
  name       text        not null default '',
  car        text        not null default 'scribble',
  livery     text        not null default 'stripes',
  num        int         not null default 9,
  t          real        not null check (t > 10 and t < 900),   -- stage time in seconds
  splits     jsonb       not null default '[]'::jsonb,
  path       jsonb       not null check (pg_column_size(path) < 300000),  -- the ghost: x, y, heading, height every 0.1 s
  updated_at timestamptz not null default now(),
  primary key (player_id, stage)
);

create index if not exists rally_runs_board on public.rally_runs (stage, rev, grp, t);

alter table public.rally_runs enable row level security;

-- Everyone can see best runs (that's how friends show up as ghosts and on the leaderboard).
create policy "anyone can read rally runs"
  on public.rally_runs for select using (true);

-- Each player can only add or change their own runs.
create policy "players add their own rally runs"
  on public.rally_runs for insert with check (auth.uid() = player_id);

create policy "players update their own rally runs"
  on public.rally_runs for update using (auth.uid() = player_id) with check (auth.uid() = player_id);
