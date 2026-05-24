-- =====================================================================
-- Buchclub v1 — Full schema for all 5 phases
-- Phase 1 lays this foundation so later phases never modify it.
-- =====================================================================

-- Required extensions (Supabase hosts these by default)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. profiles  (PROF-01, PROF-02, PROF-03 — Phase 2)
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  preferred_language text check (preferred_language in ('en','de')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_delete_self"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 2. clubs  (CLUB-01..CLUB-04 — Phase 2)
-- =====================================================================
create table public.clubs (
  id uuid primary key default uuid_generate_v4(),
  name text not null check (char_length(name) between 1 and 80),
  description text,
  invite_code text not null unique check (char_length(invite_code) = 8),
  is_public boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clubs_is_public_idx on public.clubs(is_public) where is_public = true;
create index clubs_invite_code_idx on public.clubs(invite_code);

alter table public.clubs enable row level security;

create policy "clubs_select_public_or_member"
  on public.clubs for select
  to authenticated
  using (
    is_public
    or exists (
      select 1 from public.club_members cm
      where cm.club_id = clubs.id and cm.user_id = auth.uid()
    )
  );

create policy "clubs_insert_authenticated"
  on public.clubs for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "clubs_update_admin"
  on public.clubs for update
  to authenticated
  using (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = clubs.id and cm.user_id = auth.uid() and cm.role = 'admin'
    )
  );

create policy "clubs_delete_admin"
  on public.clubs for delete
  to authenticated
  using (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = clubs.id and cm.user_id = auth.uid() and cm.role = 'admin'
    )
  );

-- =====================================================================
-- 3. club_members  (CLUB-02, CLUB-03, CLUB-05, CLUB-06 — Phase 2)
-- =====================================================================
create table public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create index club_members_user_id_idx on public.club_members(user_id);

alter table public.club_members enable row level security;

create policy "club_members_select_co_member"
  on public.club_members for select
  to authenticated
  using (
    exists (
      select 1 from public.club_members cm2
      where cm2.club_id = club_members.club_id and cm2.user_id = auth.uid()
    )
  );

create policy "club_members_insert_self_or_admin"
  on public.club_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.club_members cm
      where cm.club_id = club_members.club_id and cm.user_id = auth.uid() and cm.role = 'admin'
    )
  );

create policy "club_members_update_admin"
  on public.club_members for update
  to authenticated
  using (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = club_members.club_id and cm.user_id = auth.uid() and cm.role = 'admin'
    )
  );

create policy "club_members_delete_self_or_admin"
  on public.club_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.club_members cm
      where cm.club_id = club_members.club_id and cm.user_id = auth.uid() and cm.role = 'admin'
    )
  );

-- =====================================================================
-- 4. books  (LIST-02 — Phase 3 — global cache of book metadata from Google Books)
-- =====================================================================
create table public.books (
  id uuid primary key default uuid_generate_v4(),
  google_books_id text unique,
  isbn text,
  title text not null,
  author text,
  cover_url text,
  created_at timestamptz not null default now()
);

create index books_google_books_id_idx on public.books(google_books_id);
create index books_isbn_idx on public.books(isbn);

alter table public.books enable row level security;

create policy "books_select_authenticated"
  on public.books for select
  to authenticated
  using (true);

create policy "books_insert_authenticated"
  on public.books for insert
  to authenticated
  with check (true);

-- No update/delete policies — books are an append-only cache.

-- =====================================================================
-- 5. personal_books  (LIST-03..LIST-06 — Phase 3)
-- =====================================================================
create table public.personal_books (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  status text not null check (status in ('planned','reading','completed')) default 'planned',
  added_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create index personal_books_user_id_idx on public.personal_books(user_id);

alter table public.personal_books enable row level security;

create policy "personal_books_select_self"
  on public.personal_books for select
  to authenticated
  using (auth.uid() = user_id);

create policy "personal_books_insert_self"
  on public.personal_books for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "personal_books_update_self"
  on public.personal_books for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "personal_books_delete_self"
  on public.personal_books for delete
  to authenticated
  using (auth.uid() = user_id);

-- =====================================================================
-- 6. pool_books  (POOL-01..POOL-03 — Phase 4)
-- =====================================================================
create table public.pool_books (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  proposed_by uuid not null references public.profiles(id) on delete restrict,
  vote_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (club_id, book_id)
);

create index pool_books_club_id_idx on public.pool_books(club_id);
create index pool_books_vote_count_idx on public.pool_books(club_id, vote_count desc);

alter table public.pool_books enable row level security;

create policy "pool_books_select_member"
  on public.pool_books for select
  to authenticated
  using (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = pool_books.club_id and cm.user_id = auth.uid()
    )
  );

create policy "pool_books_insert_member"
  on public.pool_books for insert
  to authenticated
  with check (
    proposed_by = auth.uid()
    and exists (
      select 1 from public.club_members cm
      where cm.club_id = pool_books.club_id and cm.user_id = auth.uid()
    )
  );

-- vote_count is updated ONLY by the increment_book_vote RPC (SECURITY DEFINER).
-- No update policy means clients cannot UPDATE vote_count directly.

create policy "pool_books_delete_admin"
  on public.pool_books for delete
  to authenticated
  using (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = pool_books.club_id and cm.user_id = auth.uid() and cm.role = 'admin'
    )
  );

-- =====================================================================
-- 7. votes  (VOTE-01..VOTE-04 — Phase 4)
-- DB-level uniqueness prevents duplicate votes (VOTE-04).
-- All inserts route through increment_book_vote RPC (Decision Init#4).
-- =====================================================================
create table public.votes (
  pool_book_id uuid not null references public.pool_books(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (pool_book_id, user_id)
);

create index votes_user_id_idx on public.votes(user_id);

alter table public.votes enable row level security;

create policy "votes_select_member"
  on public.votes for select
  to authenticated
  using (
    exists (
      select 1
      from public.pool_books pb
      join public.club_members cm on cm.club_id = pb.club_id
      where pb.id = votes.pool_book_id and cm.user_id = auth.uid()
    )
  );

-- NO INSERT/UPDATE/DELETE policies — clients cannot write directly.
-- The increment_book_vote RPC uses SECURITY DEFINER to bypass RLS for the insert.

-- =====================================================================
-- 8. meetings  (MEET-01..MEET-05 — Phase 5)
-- =====================================================================
create table public.meetings (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  scheduled_at timestamptz not null,
  location text,
  video_link text,
  locked_book_id uuid references public.pool_books(id) on delete set null,
  locked_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index meetings_club_id_idx on public.meetings(club_id, scheduled_at desc);

alter table public.meetings enable row level security;

create policy "meetings_select_member"
  on public.meetings for select
  to authenticated
  using (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = meetings.club_id and cm.user_id = auth.uid()
    )
  );

create policy "meetings_insert_admin"
  on public.meetings for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.club_members cm
      where cm.club_id = meetings.club_id and cm.user_id = auth.uid() and cm.role = 'admin'
    )
  );

create policy "meetings_update_admin"
  on public.meetings for update
  to authenticated
  using (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = meetings.club_id and cm.user_id = auth.uid() and cm.role = 'admin'
    )
  );

create policy "meetings_delete_admin"
  on public.meetings for delete
  to authenticated
  using (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = meetings.club_id and cm.user_id = auth.uid() and cm.role = 'admin'
    )
  );

-- =====================================================================
-- 9. increment_book_vote RPC  (VOTE-02, VOTE-04 — Phase 4)
-- Atomic vote insert + count increment. SECURITY DEFINER bypasses votes RLS.
-- Returns the new vote_count. Raises 23505 if user already voted.
-- =====================================================================
create or replace function public.increment_book_vote(p_pool_book_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_club_id uuid;
  v_is_member boolean;
  v_new_count integer;
begin
  -- Caller identity from the request JWT
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- Membership check: voter must belong to the club that owns the pool_book
  select pb.club_id into v_club_id
  from public.pool_books pb
  where pb.id = p_pool_book_id;

  if v_club_id is null then
    raise exception 'pool_book not found' using errcode = '22023';
  end if;

  select exists (
    select 1 from public.club_members cm
    where cm.club_id = v_club_id and cm.user_id = v_user_id
  ) into v_is_member;

  if not v_is_member then
    raise exception 'Not a club member' using errcode = '42501';
  end if;

  -- Atomic insert + counter bump. Unique PK on (pool_book_id, user_id) raises 23505 on duplicate.
  insert into public.votes (pool_book_id, user_id) values (p_pool_book_id, v_user_id);

  update public.pool_books
    set vote_count = vote_count + 1
    where id = p_pool_book_id
    returning vote_count into v_new_count;

  return v_new_count;
end;
$$;

grant execute on function public.increment_book_vote(uuid) to authenticated;

-- =====================================================================
-- 10. Realtime publication for live vote counts (VOTE-03 — Phase 4)
-- =====================================================================
alter publication supabase_realtime add table public.pool_books;
alter publication supabase_realtime add table public.meetings;

-- =====================================================================
-- 11. updated_at trigger helper (used by profiles, clubs)
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger clubs_set_updated_at before update on public.clubs
  for each row execute function public.set_updated_at();
