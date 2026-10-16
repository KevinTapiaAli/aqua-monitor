begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 100),
  created_at timestamptz not null default now()
);
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  location text not null default '' check (length(location) <= 160),
  is_active boolean not null default true,
  expected_interval_seconds integer not null default 10 check (expected_interval_seconds between 5 and 3600),
  last_received_at timestamptz,
  sensor_limits jsonb not null default '{}' check (jsonb_typeof(sensor_limits) = 'object'),
  created_at timestamptz not null default now()
);
create table public.device_users (
  device_id uuid not null references public.devices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (device_id, user_id)
);
create index device_users_user_idx on public.device_users(user_id, device_id);
create index devices_owner_idx on public.devices(owner_id);
create table private.device_credentials (
  device_id uuid primary key references public.devices(id) on delete cascade,
  token_hash text check (token_hash ~ '^[a-f0-9]{64}$'),
  rotated_at timestamptz not null default now()
);

create function public.valid_quality(q jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(q) = 'object'
    and q ?& array['ph', 'temperature_c', 'turbidity_value', 'ec_us_cm']
    and (select count(*) = 4 from jsonb_each(q))
    and not exists (select 1 from jsonb_each_text(q)
      where value not in ('ok', 'uncalibrated', 'out_of_range', 'sensor_error', 'missing') or value is null);
$$;

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  reading_id uuid not null,
  ph double precision check (ph > '-Infinity'::float8 and ph < 'Infinity'::float8),
  temperature_c double precision check (temperature_c >= -273.15 and temperature_c < 'Infinity'::float8),
  turbidity_value double precision check (turbidity_value >= 0 and turbidity_value < 'Infinity'::float8),
  turbidity_unit text check (turbidity_unit in ('NTU', 'V', 'ADC')),
  ec_us_cm double precision check (ec_us_cm >= 0 and ec_us_cm < 'Infinity'::float8),
  measured_at timestamptz,
  received_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default now(),
  quality jsonb not null check (public.valid_quality(quality)),
  raw jsonb not null default '{}' check (jsonb_typeof(raw) = 'object' and octet_length(raw::text) <= 8192),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  unique (device_id, reading_id),
  check ((turbidity_value is null) = (turbidity_unit is null)),
  check ((quality->>'ph' in ('ok', 'out_of_range')) = (ph is not null)),
  check ((quality->>'temperature_c' in ('ok', 'out_of_range')) = (temperature_c is not null)),
  check ((quality->>'ec_us_cm' in ('ok', 'out_of_range')) = (ec_us_cm is not null)),
  check (case quality->>'turbidity_value'
    when 'ok' then turbidity_value is not null and turbidity_unit = 'NTU'
    when 'out_of_range' then turbidity_value is not null and turbidity_unit = 'NTU'
    when 'uncalibrated' then turbidity_value is null or turbidity_unit in ('V', 'ADC')
    else turbidity_value is null end)
);
create index measurements_history_idx on public.measurements(device_id, received_at desc, id desc);
create index measurements_acquisition_idx on public.measurements(device_id, measured_at desc) where measured_at is not null;

create table public.calibrations (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  parameter text not null check (parameter in ('ph', 'temperature_c', 'turbidity_value', 'ec_us_cm')),
  method text not null check (length(trim(method)) between 3 and 500),
  reference text not null check (length(trim(reference)) between 3 and 500),
  coefficients jsonb not null default '{}' check (jsonb_typeof(coefficients) = 'object' and octet_length(coefficients::text) <= 4096),
  performed_at timestamptz not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index calibrations_device_idx on public.calibrations(device_id, performed_at desc);
create table public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  parameter text not null check (parameter in ('ph', 'temperature_c', 'turbidity_value', 'ec_us_cm')),
  unit text not null,
  min_value double precision check (min_value > '-Infinity'::float8 and min_value < 'Infinity'::float8),
  max_value double precision check (max_value > '-Infinity'::float8 and max_value < 'Infinity'::float8),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(device_id, parameter),
  check (min_value is not null or max_value is not null),
  check (min_value is null or max_value is null or min_value < max_value),
  check (unit = case parameter when 'ph' then 'pH' when 'temperature_c' then '°C' when 'turbidity_value' then 'NTU' when 'ec_us_cm' then 'µS/cm' end)
);
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  measurement_id uuid not null references public.measurements(id) on delete cascade,
  rule_id uuid references public.alert_rules(id) on delete set null,
  parameter text not null check (parameter in ('ph', 'temperature_c', 'turbidity_value', 'ec_us_cm')),
  kind text not null check (kind in ('threshold', 'sensor_error', 'out_of_range')),
  message text not null,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(measurement_id, parameter, kind)
);
create index alerts_active_idx on public.alerts(device_id, created_at desc) where acknowledged_at is null;
create index alerts_measurement_idx on public.alerts(measurement_id);
create index alerts_rule_idx on public.alerts(rule_id);

-- SECURITY DEFINER evita recursión de las políticas sobre device_users.
-- No recibe un user_id: siempre utiliza la identidad firmada de la sesión.
create function public.can_access_device(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.device_users where device_id = target and user_id = (select auth.uid()));
$$;
create function public.owns_device(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.devices where id = target and owner_id = (select auth.uid()));
$$;

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.device_users enable row level security;
alter table public.measurements enable row level security;
alter table public.calibrations enable row level security;
alter table public.alert_rules enable row level security;
alter table public.alerts enable row level security;
alter table private.device_credentials enable row level security;

create policy profile_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profile_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy device_read on public.devices for select to authenticated using (public.can_access_device(id));
create policy device_update on public.devices for update to authenticated using (public.owns_device(id)) with check (public.owns_device(id));
create policy membership_read on public.device_users for select to authenticated using (user_id = (select auth.uid()) or public.owns_device(device_id));
create policy measurement_read on public.measurements for select to authenticated using (public.can_access_device(device_id));
create policy calibration_read on public.calibrations for select to authenticated using (public.can_access_device(device_id));
create policy calibration_insert on public.calibrations for insert to authenticated with check (public.owns_device(device_id) and created_by = (select auth.uid()));
create policy rule_read on public.alert_rules for select to authenticated using (public.can_access_device(device_id));
create policy rule_insert on public.alert_rules for insert to authenticated with check (public.owns_device(device_id));
create policy rule_update on public.alert_rules for update to authenticated using (public.owns_device(device_id)) with check (public.owns_device(device_id));
create policy alert_read on public.alerts for select to authenticated using (public.can_access_device(device_id));

revoke all on public.profiles, public.devices, public.device_users, public.measurements,
  public.calibrations, public.alert_rules, public.alerts from anon, authenticated;
grant select on public.profiles, public.devices, public.device_users, public.measurements,
  public.calibrations, public.alert_rules, public.alerts to authenticated;
grant insert (id, display_name), update (display_name) on public.profiles to authenticated;
grant update (name, location, is_active, expected_interval_seconds, sensor_limits) on public.devices to authenticated;
grant insert (device_id, parameter, method, reference, coefficients, performed_at, created_by) on public.calibrations to authenticated;
grant insert (device_id, parameter, unit, min_value, max_value, enabled),
  update (unit, min_value, max_value, enabled) on public.alert_rules to authenticated;

create function public.register_device(p_device_id uuid, p_name text, p_location text, p_interval integer, p_token_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode = '42501'; end if;
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_token_hash' using errcode = '22023'; end if;
  insert into public.devices(id, owner_id, name, location, expected_interval_seconds)
    values(p_device_id, auth.uid(), p_name, p_location, p_interval);
  insert into public.device_users(device_id, user_id, role) values(p_device_id, auth.uid(), 'owner');
  insert into private.device_credentials(device_id, token_hash) values(p_device_id, p_token_hash);
  return p_device_id;
end;
$$;

create function public.rotate_device_credential(p_device_id uuid, p_token_hash text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.devices where id = p_device_id and owner_id = auth.uid() for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  update private.device_credentials set token_hash = p_token_hash, rotated_at = now() where device_id = p_device_id;
end;
$$;

create function public.acknowledge_alert(p_alert_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.alerts set acknowledged_at = now(), acknowledged_by = auth.uid()
    where id = p_alert_id and public.owns_device(device_id) and acknowledged_at is null;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end;
$$;

-- Una transacción: bloqueo del dispositivo, identidad, idempotencia, rangos,
-- inserción, last_received_at y alertas. No accesible con la clave pública.
create function public.ingest_measurement(p_device_id uuid, p_token_hash text, p_payload jsonb, p_payload_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  d public.devices%rowtype;
  m public.measurements%rowtype;
  stored_hash text;
  parameter_name text;
  value_number double precision;
  limits jsonb;
  r public.alert_rules%rowtype;
begin
  select * into d from public.devices where id = p_device_id for update;
  if not found then raise exception 'invalid_device' using errcode = '28000'; end if;
  select token_hash into stored_hash from private.device_credentials where device_id = p_device_id;
  if stored_hash is null or p_token_hash is null or stored_hash <> p_token_hash then
    raise exception 'invalid_device' using errcode = '28000';
  end if;
  if not d.is_active then raise exception 'inactive_device' using errcode = '42501'; end if;

  select * into m from public.measurements where device_id = p_device_id and reading_id = (p_payload->>'reading_id')::uuid;
  if found then
    if m.payload_hash <> p_payload_hash then raise exception 'reading_conflict' using errcode = 'P0001'; end if;
    return jsonb_build_object('id', m.id, 'reading_id', m.reading_id, 'received_at', m.received_at, 'duplicate', true);
  end if;
  if d.last_received_at > clock_timestamp() - interval '1 second' then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- Los límites se introducen desde la ficha técnica real. Sin valores supuestos.
  for parameter_name, limits in select key, value from jsonb_each(d.sensor_limits) loop
    value_number := (p_payload->>parameter_name)::double precision;
    if value_number is not null and
      (parameter_name <> 'turbidity_value' or limits->>'unit' = p_payload->>'turbidity_unit') and
      (value_number < (limits->>'min')::double precision or value_number > (limits->>'max')::double precision)
    then raise exception 'sensor_range' using errcode = '22023'; end if;
  end loop;
  insert into public.measurements(device_id, reading_id, ph, temperature_c, turbidity_value, turbidity_unit,
    ec_us_cm, measured_at, quality, raw, payload_hash)
  values(p_device_id, (p_payload->>'reading_id')::uuid, (p_payload->>'ph')::double precision,
    (p_payload->>'temperature_c')::double precision, (p_payload->>'turbidity_value')::double precision,
    p_payload->>'turbidity_unit', (p_payload->>'ec_us_cm')::double precision,
    (p_payload->>'measured_at')::timestamptz, p_payload->'quality', p_payload->'raw', p_payload_hash)
  returning * into m;
  update public.devices set last_received_at = m.received_at where id = d.id;

  for parameter_name in select unnest(array['ph','temperature_c','turbidity_value','ec_us_cm']) loop
    if m.quality->>parameter_name in ('sensor_error', 'out_of_range') then
      insert into public.alerts(device_id, measurement_id, parameter, kind, message)
      values(d.id, m.id, parameter_name, m.quality->>parameter_name,
        case when m.quality->>parameter_name = 'sensor_error' then 'El sensor informó un error.' else 'El sensor informó un valor fuera de rango.' end);
    end if;
  end loop;
  for r in select * from public.alert_rules where device_id = d.id and enabled loop
    value_number := (p_payload->>r.parameter)::double precision;
    if m.quality->>r.parameter = 'ok' and value_number is not null
      and (r.parameter <> 'turbidity_value' or r.unit = m.turbidity_unit)
      and ((r.min_value is not null and value_number < r.min_value) or (r.max_value is not null and value_number > r.max_value))
    then
      insert into public.alerts(device_id, measurement_id, rule_id, parameter, kind, message)
      values(d.id, m.id, r.id, r.parameter, 'threshold',
        format('Valor %s %s fuera del umbral configurado [%s, %s].', value_number, r.unit, coalesce(r.min_value::text, '—'), coalesce(r.max_value::text, '—')));
    end if;
  end loop;
  return jsonb_build_object('id', m.id, 'reading_id', m.reading_id, 'received_at', m.received_at, 'duplicate', false);
end;
$$;

revoke all on function public.valid_quality(jsonb), public.can_access_device(uuid), public.owns_device(uuid),
  public.register_device(uuid,text,text,integer,text), public.rotate_device_credential(uuid,text),
  public.acknowledge_alert(uuid), public.ingest_measurement(uuid,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.valid_quality(jsonb), public.can_access_device(uuid), public.owns_device(uuid),
  public.register_device(uuid,text,text,integer,text), public.rotate_device_credential(uuid,text), public.acknowledge_alert(uuid) to authenticated;
grant execute on function public.ingest_measurement(uuid,text,jsonb,text) to service_role;

-- Supabase ya crea esta publicación. Los filtros Realtime siguen las políticas SELECT.
alter publication supabase_realtime add table public.measurements, public.alerts, public.devices;

comment on table public.measurements is 'Datos físicos; ningún registro implica potabilidad. measured_at NULL indica reloj sin sincronizar.';
comment on column public.devices.sensor_limits is 'Límites del modelo real y referencia documental; independientes de los umbrales de alerta.';
commit;
