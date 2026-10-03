-- Local seed only; production migrations do not contain sample branches or identities.
insert into public.branches(id,name,code) values ('10000000-0000-4000-8000-000000000001','Central Branch','JN-001'),('10000000-0000-4000-8000-000000000002','North Branch','JN-002') on conflict do nothing;
do $$ declare b uuid; begin for b in select id from public.branches where not exists(select 1 from public.branch_roles r where r.branch_id=branches.id) loop perform private.seed_roles(b,null); end loop; end $$;
