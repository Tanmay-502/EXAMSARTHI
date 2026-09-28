-- Return the distinct non-null subjects available to authenticated practice users.
-- Security invoker ensures the function executes with the caller's database privileges.
create or replace function public.practice_subjects()
returns table(subject text)
language sql
security invoker
set search_path = public
as $$
  select distinct q.subject
  from public.questions as q
  where q.subject is not null
    and btrim(q.subject) <> ''
  order by q.subject;
$$;

revoke all on function public.practice_subjects() from public;
grant execute on function public.practice_subjects() to authenticated;
