begin;

-- También se valida el JSON enviado directamente a PostgREST bajo RLS.
create function public.valid_sensor_limits(limits jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  p text;
  item jsonb;
  lo double precision;
  hi double precision;
begin
  if limits is null or jsonb_typeof(limits) <> 'object' then return false; end if;
  for p, item in select key, value from jsonb_each(limits) loop
    if p not in ('ph','temperature_c','turbidity_value','ec_us_cm') or jsonb_typeof(item) <> 'object' then return false; end if;
    if not (item ?& array['min','max','unit','reference']) or (select count(*) from jsonb_object_keys(item)) <> 4 then return false; end if;
    if jsonb_typeof(item->'min') <> 'number' or jsonb_typeof(item->'max') <> 'number'
      or jsonb_typeof(item->'unit') <> 'string' or jsonb_typeof(item->'reference') <> 'string' then return false; end if;
    lo := (item->>'min')::double precision;
    hi := (item->>'max')::double precision;
    if not (lo > '-Infinity'::float8 and hi < 'Infinity'::float8 and lo < hi) then return false; end if;
    if length(trim(item->>'reference')) not between 3 and 300 then return false; end if;
    if (p = 'ph' and item->>'unit' <> 'pH') or (p = 'temperature_c' and item->>'unit' <> '°C')
      or (p = 'ec_us_cm' and item->>'unit' <> 'µS/cm')
      or (p = 'turbidity_value' and item->>'unit' not in ('NTU','V','ADC')) then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function public.valid_sensor_limits(jsonb) from public, anon, authenticated;
grant execute on function public.valid_sensor_limits(jsonb) to authenticated;
alter table public.devices add constraint devices_sensor_limits_valid check (public.valid_sensor_limits(sensor_limits));

commit;
