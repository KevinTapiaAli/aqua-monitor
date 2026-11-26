begin;

-- El propietario conserva su membresía y solo puede compartir acceso de consulta.
create policy membership_add_observer on public.device_users
  for insert to authenticated
  with check (
    role = 'viewer'
    and user_id <> (select auth.uid())
    and public.owns_device(device_id)
  );

create policy membership_remove_observer on public.device_users
  for delete to authenticated
  using (
    role = 'viewer'
    and user_id <> (select auth.uid())
    and public.owns_device(device_id)
  );

grant insert (device_id, user_id, role), delete on public.device_users to authenticated;

commit;
