-- Cambio a sensores ambientales. Ejecutar UNA VEZ después de detener el firmware.
-- Conserva la temperatura y archiva los registros anteriores antes de retirar campos.
begin;
lock table public.devices, public.measurements, public.alerts, public.alert_rules, public.calibrations in access exclusive mode;

create table private.sensor_transition_20261019 (
  source_table text not null,
  source_id uuid not null,
  snapshot jsonb not null,
  archived_at timestamptz not null default now(),
  primary key (source_table, source_id)
);
alter table private.sensor_transition_20261019 enable row level security;
revoke all on private.sensor_transition_20261019 from public, anon, authenticated, service_role;
insert into private.sensor_transition_20261019(source_table, source_id, snapshot)
  select 'measurements', id, to_jsonb(m) from public.measurements m;
insert into private.sensor_transition_20261019(source_table, source_id, snapshot)
  select 'devices', id, to_jsonb(d) from public.devices d;
insert into private.sensor_transition_20261019(source_table, source_id, snapshot)
  select 'alerts', id, to_jsonb(a) from public.alerts a where parameter <> 'temperature_c';
insert into private.sensor_transition_20261019(source_table, source_id, snapshot)
  select 'alert_rules', id, to_jsonb(r) from public.alert_rules r where parameter <> 'temperature_c';
insert into private.sensor_transition_20261019(source_table, source_id, snapshot)
  select 'calibrations', id, to_jsonb(c) from public.calibrations c where parameter <> 'temperature_c';
delete from public.alerts where parameter <> 'temperature_c';
delete from public.alert_rules where parameter <> 'temperature_c';
delete from public.calibrations where parameter <> 'temperature_c';

-- Solo se reemplazan CHECK; se preservan PK, FK, UNIQUE, índices, políticas y permisos.
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid = 'public.measurements'::regclass and contype = 'c' loop
    execute format('alter table public.measurements drop constraint %I', c.conname);
  end loop;
  for c in select conname from pg_constraint where conrelid = 'public.alert_rules'::regclass and contype = 'c'
    and position('unit' in pg_get_constraintdef(oid)) > 0 loop
    execute format('alter table public.alert_rules drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.measurements drop column ph, drop column turbidity_value, drop column turbidity_unit, drop column ec_us_cm;
alter table public.measurements add column soil_adc double precision, add column gas_adc double precision, add column light_adc double precision;
update public.measurements set
  quality = jsonb_build_object('temperature_c', quality->>'temperature_c', 'soil_adc', 'missing', 'gas_adc', 'missing', 'light_adc', 'missing'),
  raw = case when raw ? 'temperature_c' then jsonb_build_object('temperature_c', raw->'temperature_c') else '{}'::jsonb end;

create or replace function public.valid_quality(q jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(q) = 'object'
    and q ?& array['temperature_c','soil_adc','gas_adc','light_adc']
    and (select count(*) = 4 from jsonb_each(q))
    and not exists (select 1 from jsonb_each_text(q)
      where value not in ('ok','uncalibrated','out_of_range','sensor_error','missing') or value is null), false);
$$;
alter table public.measurements
  add constraint measurements_temperature_valid check (temperature_c >= -273.15 and temperature_c < 'Infinity'::float8),
  add constraint measurements_humidity_valid check (soil_adc between 0 and 65535 and soil_adc = floor(soil_adc)),
  add constraint measurements_gas_valid check (gas_adc between 0 and 65535 and gas_adc = floor(gas_adc)),
  add constraint measurements_light_valid check (light_adc between 0 and 65535 and light_adc = floor(light_adc)),
  add constraint measurements_quality_valid check (public.valid_quality(quality)),
  add constraint measurements_raw_valid check (jsonb_typeof(raw) = 'object' and octet_length(raw::text) <= 8192),
  add constraint measurements_hash_valid check (payload_hash ~ '^[a-f0-9]{64}$'),
  add constraint measurements_temperature_quality check ((quality->>'temperature_c' in ('ok','out_of_range')) = (temperature_c is not null)),
  add constraint measurements_humidity_quality check ((quality->>'soil_adc' in ('ok','out_of_range')) = (soil_adc is not null)),
  add constraint measurements_gas_quality check ((quality->>'gas_adc' in ('ok','out_of_range')) = (gas_adc is not null)),
  add constraint measurements_light_quality check ((quality->>'light_adc' in ('ok','out_of_range')) = (light_adc is not null));

alter table public.calibrations drop constraint calibrations_parameter_check;
alter table public.alert_rules drop constraint alert_rules_parameter_check;
alter table public.alerts drop constraint alerts_parameter_check;
alter table public.calibrations add constraint calibrations_parameter_check check (parameter in ('temperature_c','soil_adc','gas_adc','light_adc'));
alter table public.alert_rules add constraint alert_rules_parameter_check check (parameter in ('temperature_c','soil_adc','gas_adc','light_adc'));
alter table public.alerts add constraint alerts_parameter_check check (parameter in ('temperature_c','soil_adc','gas_adc','light_adc'));
alter table public.alert_rules add constraint alert_rules_unit_valid check (unit = case parameter when 'temperature_c' then '°C' when 'soil_adc' then 'ADC' when 'gas_adc' then 'ADC' when 'light_adc' then 'ADC' end);

alter table public.devices drop constraint devices_sensor_limits_valid;
update public.devices set sensor_limits = case when sensor_limits ? 'temperature_c' then jsonb_build_object('temperature_c', sensor_limits->'temperature_c') else '{}'::jsonb end;
create or replace function public.valid_sensor_limits(limits jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  p text;
  item jsonb;
  lo double precision;
  hi double precision;
begin
  if limits is null or jsonb_typeof(limits) <> 'object' then return false; end if;
  for p, item in select key, value from jsonb_each(limits) loop
    if p not in ('soil_adc','temperature_c','gas_adc','light_adc') or jsonb_typeof(item) <> 'object' then return false; end if;
    if not (item ?& array['min','max','unit','reference']) or (select count(*) from jsonb_object_keys(item)) <> 4 then return false; end if;
    if jsonb_typeof(item->'min') <> 'number' or jsonb_typeof(item->'max') <> 'number'
      or jsonb_typeof(item->'unit') <> 'string' or jsonb_typeof(item->'reference') <> 'string' then return false; end if;
    lo := (item->>'min')::double precision;
    hi := (item->>'max')::double precision;
    if not (lo > '-Infinity'::float8 and hi < 'Infinity'::float8 and lo < hi) then return false; end if;
    if length(trim(item->>'reference')) not between 3 and 300 then return false; end if;
    if (p = 'soil_adc' and item->>'unit' <> 'ADC') or (p = 'temperature_c' and item->>'unit' <> '°C')
      or (p = 'light_adc' and item->>'unit' <> 'ADC')
      or (p = 'gas_adc' and item->>'unit' <> 'ADC') then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

alter table public.devices add constraint devices_sensor_limits_valid check (public.valid_sensor_limits(sensor_limits));
create or replace function public.ingest_measurement(p_device_id uuid, p_token_hash text, p_payload jsonb, p_payload_hash text)
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
      (value_number < (limits->>'min')::double precision or value_number > (limits->>'max')::double precision)
    then raise exception 'sensor_range' using errcode = '22023'; end if;
  end loop;
  insert into public.measurements(device_id, reading_id, temperature_c, soil_adc, gas_adc, light_adc,
    measured_at, quality, raw, payload_hash)
  values(p_device_id, (p_payload->>'reading_id')::uuid,
    (p_payload->>'temperature_c')::double precision, (p_payload->>'soil_adc')::double precision,
    (p_payload->>'gas_adc')::double precision, (p_payload->>'light_adc')::double precision,
    (p_payload->>'measured_at')::timestamptz, p_payload->'quality', p_payload->'raw', p_payload_hash)
  returning * into m;
  update public.devices set last_received_at = m.received_at where id = d.id;

  for parameter_name in select unnest(array['soil_adc','temperature_c','gas_adc','light_adc']) loop
    if m.quality->>parameter_name in ('sensor_error', 'out_of_range') then
      insert into public.alerts(device_id, measurement_id, parameter, kind, message)
      values(d.id, m.id, parameter_name, m.quality->>parameter_name,
        case when m.quality->>parameter_name = 'sensor_error' then 'El sensor informó un error.' else 'El sensor informó un valor fuera de rango.' end);
    end if;
  end loop;
  for r in select * from public.alert_rules where device_id = d.id and enabled loop
    value_number := (p_payload->>r.parameter)::double precision;
    if m.quality->>r.parameter = 'ok' and value_number is not null
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

revoke all on function public.valid_quality(jsonb), public.valid_sensor_limits(jsonb), public.ingest_measurement(uuid,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.valid_quality(jsonb), public.valid_sensor_limits(jsonb) to authenticated;
grant execute on function public.ingest_measurement(uuid,text,jsonb,text) to service_role;
comment on table public.measurements is 'Sensores ambientales. Gas y luz en ADC; no equivalen a CO2 ppm ni lux. Historial anterior archivado en private.sensor_transition_20261019.';
comment on column public.measurements.gas_adc is 'Respuesta MQ-135 en escala read_u16 0–65535. Sin conversión a CO2.';
comment on column public.measurements.light_adc is 'Respuesta LDR en escala read_u16 0–65535. Sin conversión a lux.';
notify pgrst, 'reload schema';
commit;
