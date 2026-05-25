-- Phase 2: PROF-03 delete_account() RPC
-- SECURITY DEFINER so the function runs with postgres privileges
-- and can DELETE from auth.users (bypasses RLS on auth schema)
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  -- Deleting from auth.users cascades to public.profiles via ON DELETE CASCADE trigger
  delete from auth.users where id = auth.uid();
end;
$$;

-- Revoke from public (default), grant only to authenticated role
revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
