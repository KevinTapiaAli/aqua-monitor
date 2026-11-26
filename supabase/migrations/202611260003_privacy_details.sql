begin;

create table public.privacy_details (
  id boolean primary key default true check (id),
  responsible_name text not null check (char_length(btrim(responsible_name)) between 1 and 100),
  contact_email text check (
    char_length(contact_email) <= 254 and
    contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  retention_months integer check (retention_months > 0)
);

insert into public.privacy_details (responsible_name)
values ('Equipo Aqua Monitor (ejemplo)');

-- Consultar los metadatos actuales permite revocar el permiso sin esperar al vencimiento del JWT.
create function private.can_manage_privacy() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users
    where id = (select auth.uid()) and raw_app_meta_data -> 'aqua_privacy_admin' = 'true'::jsonb
  );
$$;

revoke all on function private.can_manage_privacy() from public, anon, authenticated;
grant execute on function private.can_manage_privacy() to authenticated;

alter table public.privacy_details enable row level security;
revoke all on public.privacy_details from anon, authenticated;
grant select on public.privacy_details to anon, authenticated;
grant update (responsible_name, contact_email, retention_months) on public.privacy_details to authenticated;

create policy privacy_details_read on public.privacy_details for select to anon, authenticated using (true);
create policy privacy_details_update on public.privacy_details for update to authenticated
  using ((select private.can_manage_privacy()))
  with check ((select private.can_manage_privacy()));

commit;
