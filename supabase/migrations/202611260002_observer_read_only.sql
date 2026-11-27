begin;

-- Los umbrales y las calibraciones forman parte de la configuración de la estación.
alter policy rule_read on public.alert_rules using (public.owns_device(device_id));
alter policy calibration_read on public.calibrations using (public.owns_device(device_id));

-- Las cuentas nuevas pueden registrar su primera estación. Una cuenta con acceso
-- exclusivamente de observador no puede registrar dispositivos.
create or replace function public.register_device(p_device_id uuid, p_name text, p_location text, p_interval integer, p_token_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then raise exception 'unauthorized' using errcode = '42501'; end if;
  if exists (
    select 1 from public.device_users where user_id = actor_id and role = 'viewer'
  ) and not exists (
    select 1 from public.devices where owner_id = actor_id
  ) then
    raise exception 'observer_cannot_register' using errcode = '42501';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_token_hash' using errcode = '22023';
  end if;

  insert into public.devices(id, owner_id, name, location, expected_interval_seconds)
    values(p_device_id, actor_id, p_name, p_location, p_interval);
  insert into public.device_users(device_id, user_id, role) values(p_device_id, actor_id, 'owner');
  insert into private.device_credentials(device_id, token_hash) values(p_device_id, p_token_hash);
  return p_device_id;
end;
$$;

commit;
