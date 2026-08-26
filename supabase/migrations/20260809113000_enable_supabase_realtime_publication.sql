do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

do $$
declare
  table_name text;
  table_names text[] := array[
    'field_reports',
    'disaster_events',
    'shelters',
    'needs',
    'inventory_items',
    'distributions',
    'third_party_aids',
    'audit_logs'
  ];
begin
  foreach table_name in array table_names loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;
