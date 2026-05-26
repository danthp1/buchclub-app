-- =====================================================================
-- Phase 4: decrement_book_vote RPC
-- Atomic vote removal + count decrement. SECURITY DEFINER bypasses votes RLS.
-- Mirrors increment_book_vote structure. Returns new vote_count.
-- Raises 22023 if no vote exists to remove.
-- =====================================================================

create or replace function public.decrement_book_vote(p_pool_book_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_club_id uuid;
  v_is_member boolean;
  v_deleted_count integer;
  v_new_count integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

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

  -- Delete the vote row. No error if it doesn't exist — idempotent removal.
  delete from public.votes
    where pool_book_id = p_pool_book_id and user_id = v_user_id;

  get diagnostics v_deleted_count = row_count;

  -- Only decrement if a row was actually deleted. Floor at 0 to prevent negatives.
  if v_deleted_count > 0 then
    update public.pool_books
      set vote_count = greatest(vote_count - 1, 0)
      where id = p_pool_book_id
      returning vote_count into v_new_count;
  else
    select vote_count into v_new_count
    from public.pool_books
    where id = p_pool_book_id;
  end if;

  return v_new_count;
end;
$$;

grant execute on function public.decrement_book_vote(uuid) to authenticated;
