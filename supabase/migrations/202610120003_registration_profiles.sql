begin;

create function private.create_user_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), 100))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.create_user_profile() from public, anon, authenticated;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.create_user_profile();

insert into public.profiles (id, display_name)
select id, left(trim(coalesce(raw_user_meta_data->>'display_name', '')), 100)
from auth.users
on conflict (id) do nothing;

commit;
