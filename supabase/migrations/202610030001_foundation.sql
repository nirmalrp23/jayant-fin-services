create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
create table public.profiles (
 id uuid primary key references auth.users(id), full_name text not null check(length(full_name) between 1 and 120),
 email text not null unique, active boolean not null default true, must_change_password boolean not null default true,
 password_operation uuid, password_operation_at timestamptz,
 created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.branches (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120), code text not null unique check(code ~ '^[A-Z0-9-]{2,20}$'),
 active boolean not null default true, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.system_roles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id), role text not null check(role in ('super_admin','admin')),
 active boolean not null default true, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.memberships (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), branch_id uuid not null references public.branches(id),
 is_manager boolean not null default false, active boolean not null default true, created_by uuid references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,branch_id), unique(id,branch_id)
);
create table public.branch_roles (
 id uuid primary key default gen_random_uuid(), branch_id uuid not null references public.branches(id), name text not null check(length(name) between 1 and 80),
 active boolean not null default true, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(branch_id,name), unique(id,branch_id)
);
create table public.permissions (id uuid primary key default gen_random_uuid(), key text not null unique, description text not null);
insert into public.permissions(key,description) values
 ('branches.view','View branch'),('branches.edit','Edit branch'),
 ('users.view','View branch users'),('users.create','Create standard accounts'),('users.edit','Edit accounts within authority'),('users.deactivate','Activate or deactivate accounts within authority'),('users.reset_password','Reset passwords within authority'),
 ('memberships.manage','Manage branch memberships'),('roles.assign','Assign approved branch roles'),('roles.manage','Create and edit branch roles'),('audit.view','View branch administrative history');
create table public.role_permissions (
 id uuid primary key default gen_random_uuid(), role_id uuid not null references public.branch_roles(id), permission_id uuid not null references public.permissions(id),
 created_at timestamptz not null default now(), unique(role_id,permission_id)
);
create table public.membership_roles (
 id uuid primary key default gen_random_uuid(), branch_id uuid not null references public.branches(id), membership_id uuid not null, role_id uuid not null,
 created_by uuid references public.profiles(id), created_at timestamptz not null default now(), unique(membership_id,role_id),
 foreign key(membership_id,branch_id) references public.memberships(id,branch_id), foreign key(role_id,branch_id) references public.branch_roles(id,branch_id)
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id), action text not null, target_id uuid,
 branch_id uuid references public.branches(id), details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table private.rate_limits (key text primary key, hits integer not null, expires_at timestamptz not null);
create table private.provisioning_failures (id uuid primary key default gen_random_uuid(), auth_user_id uuid not null, created_at timestamptz not null default now());
create index memberships_branch_idx on public.memberships(branch_id,user_id);
create index role_permissions_role_idx on public.role_permissions(role_id);
create index membership_roles_role_idx on public.membership_roles(role_id);
create index audit_branch_time_idx on public.audit_logs(branch_id,created_at desc);
create index audit_actor_idx on public.audit_logs(actor_id);
create index profiles_name_idx on public.profiles(full_name);
create function private.touch_updated() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['profiles','branches','system_roles','memberships','branch_roles'] loop
 execute format('create trigger touch_updated before update on public.%I for each row execute function private.touch_updated()',t); end loop; end $$;

-- These helpers read as their owner, avoiding recursive policies. No user metadata is consulted.
create function private.ready(a uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=a and active and not must_change_password)
$$;
create function private.global_role(a uuid) returns text language sql stable security definer set search_path = '' as $$
 select role from public.system_roles where user_id=a and active and private.ready(a)
$$;
create function private.can(a uuid,b uuid,p text) returns boolean language sql stable security definer set search_path = '' as $$
 select private.ready(a) and exists(select 1 from public.branches where id=b and active) and (
 private.global_role(a) is not null or exists(
 select 1 from public.memberships m join public.membership_roles mr on mr.membership_id=m.id
 join public.branch_roles r on r.id=mr.role_id and r.active join public.role_permissions rp on rp.role_id=r.id
 join public.permissions x on x.id=rp.permission_id
 where m.user_id=a and m.branch_id=b and m.active and x.key=p))
$$;
create function private.member(a uuid,b uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select private.ready(a) and (private.global_role(a) is not null or exists(
 select 1 from public.memberships m join public.branches b on b.id=m.branch_id where m.user_id=a and m.branch_id=$2 and m.active and b.active))
$$;
create function private.manager(a uuid,b uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select private.member(a,b) and exists(select 1 from public.memberships where user_id=a and branch_id=b and active and is_manager)
$$;
create function private.see_user(a uuid,t uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select private.ready(a) and (a=t or private.global_role(a) is not null or exists(
 select 1 from public.memberships m where m.user_id=t and private.can(a,m.branch_id,'users.view')))
$$;
create function private.manage_account(a uuid,t uuid,p text) returns boolean language sql stable security definer set search_path = '' as $$
 select private.ready(a) and (
 private.global_role(a) is not distinct from 'super_admin' or
 (private.global_role(a) is not distinct from 'admin' and not exists(select 1 from public.system_roles where user_id=t)) or
 (private.global_role(a) is null and a<>t and not exists(select 1 from public.system_roles where user_id=t)
 and exists(select 1 from public.memberships where user_id=t)
 and not exists(select 1 from public.memberships m where m.user_id=t and
 (m.is_manager or not private.manager(a,m.branch_id) or not private.can(a,m.branch_id,p)))))
$$;
create function private.delegable(a uuid,r uuid,b uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.branch_roles where id=r and branch_id=b and active) and
 (private.global_role(a) is not null or not exists(select 1 from public.role_permissions rp join public.permissions p on p.id=rp.permission_id where rp.role_id=r and not private.can(a,b,p.key)))
$$;
-- A singleton lock serializes loss of Super Admin authority, including concurrent changes.
create table private.authority_lock(id integer primary key check(id=1)); insert into private.authority_lock values(1);
create function private.guard_last_super() returns trigger language plpgsql security definer set search_path = '' as $$
 declare remaining integer; begin
 perform 1 from private.authority_lock where id=1 for update;
 select count(*) into remaining from public.system_roles r join public.profiles p on p.id=r.user_id where r.role='super_admin' and r.active and p.active;
 if remaining=0 then raise exception 'At least one active Super Admin is required'; end if; return null;
 end $$;
create constraint trigger last_super_role after update or delete on public.system_roles deferrable initially immediate for each row execute function private.guard_last_super();
create constraint trigger last_super_profile after update or delete on public.profiles deferrable initially immediate for each row execute function private.guard_last_super();

alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.system_roles enable row level security;
alter table public.memberships enable row level security;
alter table public.branch_roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.membership_roles enable row level security;
alter table public.audit_logs enable row level security;
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles,public.branches,public.system_roles,public.memberships,public.branch_roles,public.permissions,public.role_permissions,public.membership_roles,public.audit_logs to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.ready(uuid),private.global_role(uuid),private.can(uuid,uuid,text),private.member(uuid,uuid),private.manager(uuid,uuid),private.see_user(uuid,uuid) to authenticated;
create policy profile_read on public.profiles for select to authenticated using ((id=auth.uid()) or private.see_user(auth.uid(),id));
create policy branch_read on public.branches for select to authenticated using(private.member(auth.uid(),id));
create policy system_read on public.system_roles for select to authenticated using(private.ready(auth.uid()) and (user_id=auth.uid() or private.global_role(auth.uid()) is not null));
create policy membership_read on public.memberships for select to authenticated using(private.ready(auth.uid()) and (private.global_role(auth.uid()) is not null or (private.member(auth.uid(),branch_id) and (user_id=auth.uid() or private.can(auth.uid(),branch_id,'users.view')))));
create policy role_read on public.branch_roles for select to authenticated using(private.member(auth.uid(),branch_id));
create policy permission_read on public.permissions for select to authenticated using(private.ready(auth.uid()));
create policy mapping_read on public.role_permissions for select to authenticated using(exists(select 1 from public.branch_roles r where r.id=role_id and private.member(auth.uid(),r.branch_id)));
create policy assignment_read on public.membership_roles for select to authenticated using(private.member(auth.uid(),branch_id) and exists(select 1 from public.memberships m where m.id=membership_id));
create policy audit_read on public.audit_logs for select to authenticated using(private.ready(auth.uid()) and (private.global_role(auth.uid()) is not null or (private.manager(auth.uid(),branch_id) and private.can(auth.uid(),branch_id,'audit.view'))));
-- No client mutation grants or policies: all writes use the narrowly granted command below.
create function public.consume_rate_limit(k text, max_hits integer, window_seconds integer) returns boolean language plpgsql security definer set search_path = '' as $$
 declare n integer; begin
 delete from private.rate_limits where expires_at<now();
 insert into private.rate_limits values(k,1,now()+make_interval(secs=>window_seconds))
 on conflict(key) do update set hits=private.rate_limits.hits+1 returning hits into n;
 return n<=max_hits;
 end $$;

create function private.seed_roles(b uuid,a uuid) returns void language plpgsql security definer set search_path = '' as $$
 declare r uuid; begin
 insert into public.branch_roles(branch_id,name,created_by) values(b,'Manager',a) returning id into r;
 insert into public.role_permissions(role_id,permission_id) select r,id from public.permissions;
 insert into public.branch_roles(branch_id,name,created_by) values(b,'User',a) returning id into r;
 insert into public.role_permissions(role_id,permission_id) select r,id from public.permissions where key='branches.view';
 end $$;

create function public.app_command(actor uuid, operation text, payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
 declare b uuid := nullif(payload->>'branch_id','')::uuid; t uuid := nullif(payload->>'id','')::uuid;
 g text; r uuid; m uuid; p text; v uuid; target_role text; result jsonb := '{}'; event text := operation;
 begin
 -- Serialize authority checks and administrative changes, keeping check and write atomic.
 perform 1 from private.authority_lock where id=1 for update;
 if not private.ready(actor) then raise exception 'Access denied'; end if;
 g:=private.global_role(actor);
 case operation
 when 'branch.save' then
   if g is null and (t is null or not private.can(actor,t,'branches.edit')) then raise exception 'Access denied'; end if;
   if g is null and payload ? 'active' then raise exception 'Access denied'; end if;
   if t is null then
    insert into public.branches(name,code,created_by) values(payload->>'name',payload->>'code',actor) returning id into t;
    perform private.seed_roles(t,actor);
   else update public.branches set name=payload->>'name',code=payload->>'code',active=coalesce((payload->>'active')::boolean,active) where id=t;
    if not found then raise exception 'Not found'; end if;
   end if; b:=t;
 when 'account.validate', 'account.create' then
   target_role:=coalesce(payload->>'system_role','none');
   if target_role not in ('none','admin','super_admin') then raise exception 'Invalid role'; end if;
   if target_role<>'none' and g is distinct from 'super_admin' then raise exception 'Access denied'; end if;
   if g is null and (not private.manager(actor,b) or not private.can(actor,b,'users.create') or not private.can(actor,b,'memberships.manage') or not private.can(actor,b,'roles.assign')) then raise exception 'Access denied'; end if;
   if b is null and g is null then raise exception 'Branch required'; end if;
   if b is not null then
    if not exists(select 1 from public.branches where id=b and active) then raise exception 'Inactive branch'; end if;
    r:=(payload->>'role_id')::uuid;
    if r is null or not private.delegable(actor,r,b) then raise exception 'Role cannot be delegated'; end if;
   end if;
   if coalesce((payload->>'is_manager')::boolean,false) and g is null then raise exception 'Access denied'; end if;
   if operation='account.validate' then return '{}'; end if;
   insert into public.profiles(id,full_name,email,created_by) values(t,payload->>'full_name',lower(payload->>'email'),actor);
   if target_role<>'none' then insert into public.system_roles(user_id,role,created_by) values(t,target_role,actor); end if;
   if b is not null then
    insert into public.memberships(user_id,branch_id,is_manager,created_by) values(t,b,coalesce((payload->>'is_manager')::boolean,false),actor) returning id into m;
    insert into public.membership_roles(branch_id,membership_id,role_id,created_by) values(b,m,r,actor);
   end if;
 when 'account.save' then
   if not private.manage_account(actor,t,'users.edit') then raise exception 'Access denied'; end if;
   if payload ? 'active' and not private.manage_account(actor,t,'users.deactivate') then raise exception 'Access denied'; end if;
   update public.profiles set full_name=payload->>'full_name',active=coalesce((payload->>'active')::boolean,active) where id=t;
   if not found then raise exception 'Not found'; end if;
 when 'system.assign' then
   if g is distinct from 'super_admin' then raise exception 'Access denied'; end if;
   target_role:=payload->>'system_role';
   if target_role='none' then delete from public.system_roles where user_id=t;
   elsif target_role in ('super_admin','admin') then
    insert into public.system_roles(user_id,role,created_by) values(t,target_role,actor) on conflict(user_id) do update set role=excluded.role,active=true;
   else raise exception 'Invalid role'; end if;
 when 'membership.save' then
   if not exists(select 1 from public.branches where id=b and active) then raise exception 'Inactive branch'; end if;
   if g is null then
    if not private.manager(actor,b) or not private.can(actor,b,'memberships.manage') or not private.can(actor,b,'roles.assign') then raise exception 'Access denied'; end if;
    if t=actor or exists(select 1 from public.system_roles where user_id=t) or exists(select 1 from public.memberships where user_id=t and branch_id=b and is_manager) or coalesce((payload->>'is_manager')::boolean,false) then raise exception 'Access denied'; end if;
   elsif g='admin' and exists(select 1 from public.system_roles where user_id=t) then raise exception 'Access denied'; end if;
   if jsonb_array_length(payload->'role_ids')<1 then raise exception 'Choose a role'; end if;
   for r in select jsonb_array_elements_text(payload->'role_ids')::uuid loop
    if not private.delegable(actor,r,b) then raise exception 'Role cannot be delegated'; end if;
   end loop;
   insert into public.memberships(user_id,branch_id,is_manager,active,created_by) values(t,b,coalesce((payload->>'is_manager')::boolean,false),coalesce((payload->>'active')::boolean,true),actor)
   on conflict(user_id,branch_id) do update set active=excluded.active,is_manager=excluded.is_manager returning id into m;
   delete from public.membership_roles where membership_id=m;
   insert into public.membership_roles(branch_id,membership_id,role_id,created_by) select b,m,value::uuid,actor from jsonb_array_elements_text(payload->'role_ids');
 when 'role.save' then
   if not exists(select 1 from public.branches where id=b and active) then raise exception 'Inactive branch'; end if;
   if g is null and (not private.manager(actor,b) or not private.can(actor,b,'roles.manage')) then raise exception 'Access denied'; end if;
   if t is not null and not exists(select 1 from public.branch_roles where id=t and branch_id=b) then raise exception 'Access denied'; end if;
   -- Editing a shared role cannot bypass membership assignment protection.
   if g is null and t is not null and (not private.delegable(actor,t,b) or exists(
    select 1 from public.membership_roles mr join public.memberships m on m.id=mr.membership_id where mr.role_id=t and (m.user_id=actor or m.is_manager or exists(select 1 from public.system_roles where user_id=m.user_id)))) then raise exception 'Protected role'; end if;
   for p in select jsonb_array_elements_text(payload->'permissions') loop
    if not exists(select 1 from public.permissions where key=p) or (g is null and not private.can(actor,b,p)) then raise exception 'Permission cannot be delegated'; end if;
   end loop;
   if t is null then insert into public.branch_roles(branch_id,name,created_by) values(b,payload->>'name',actor) returning id into t;
   else update public.branch_roles set name=payload->>'name',active=coalesce((payload->>'active')::boolean,active) where id=t; end if;
   delete from public.role_permissions where role_id=t;
   insert into public.role_permissions(role_id,permission_id) select t,id from public.permissions where key in (select jsonb_array_elements_text(payload->'permissions'));
 when 'profile.save' then
   t:=actor; update public.profiles set full_name=payload->>'full_name' where id=actor;
 else raise exception 'Unknown operation';
 end case;
 -- Details contain only non-sensitive structural state, never raw input.
 insert into public.audit_logs(actor_id,action,target_id,branch_id,details) values(actor,event,t,b,
 jsonb_strip_nulls(jsonb_build_object('active',payload->'active','system_role',payload->'system_role','is_manager',payload->'is_manager','role_ids',payload->'role_ids','permissions',payload->'permissions')));
 if operation='account.save' then
 insert into public.audit_logs(actor_id,action,target_id,branch_id,details)
 select actor,event,t,branch_id,jsonb_strip_nulls(jsonb_build_object('active',payload->'active')) from public.memberships where user_id=t;
 end if;
 result:=jsonb_build_object('id',t); return result;
 end $$;

create function public.password_begin(actor uuid,target uuid, administrative boolean) returns uuid language plpgsql security definer set search_path = '' as $$
 declare token uuid:=gen_random_uuid(); begin
 perform 1 from private.authority_lock where id=1 for update;
 if administrative then
  if actor=target or not private.manage_account(actor,target,'users.reset_password') then raise exception 'Access denied'; end if;
 elsif actor<>target or not exists(select 1 from public.profiles where id=actor and active) then raise exception 'Access denied'; end if;
 update public.profiles set must_change_password=true,password_operation=token,password_operation_at=now()
 where id=target and password_operation is null;
 if not found then raise exception 'Password operation in progress'; end if;
 return token;
 end $$;
create function public.password_finish(actor uuid,target uuid,token uuid,administrative boolean) returns void language plpgsql security definer set search_path = '' as $$
 begin
 perform 1 from private.authority_lock where id=1 for update;
 if administrative then
  if actor=target or not private.manage_account(actor,target,'users.reset_password') then raise exception 'Access denied'; end if;
 elsif actor<>target or not exists(select 1 from public.profiles where id=actor and active) then raise exception 'Access denied'; end if;
 update public.profiles set must_change_password=administrative,password_operation=null,password_operation_at=null where id=target and password_operation=token;
 if not found then raise exception 'Password operation expired'; end if;
 insert into public.audit_logs(actor_id,action,target_id) values(actor,case when administrative then 'account.password_reset' else 'account.password_changed' end,target);
 if administrative then insert into public.audit_logs(actor_id,action,target_id,branch_id) select actor,'account.password_reset',target,branch_id from public.memberships where user_id=target; end if;
 end $$;
create function public.record_provisioning_failure(target uuid) returns void language sql security definer set search_path = '' as $$
 insert into private.provisioning_failures(auth_user_id) values(target)
$$;
-- Explicit function ACLs, including private helpers: PostgreSQL defaults to PUBLIC execute.
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.ready(uuid),private.global_role(uuid),private.can(uuid,uuid,text),private.member(uuid,uuid),private.manager(uuid,uuid),private.see_user(uuid,uuid) to authenticated;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.app_command(uuid,text,jsonb),public.consume_rate_limit(text,integer,integer),public.password_begin(uuid,uuid,boolean),public.password_finish(uuid,uuid,uuid,boolean),public.record_provisioning_failure(uuid) to service_role;
create function public.account_capabilities(actor uuid,target uuid) returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('edit',private.manage_account(actor,target,'users.edit'),'deactivate',private.manage_account(actor,target,'users.deactivate'),'reset',private.manage_account(actor,target,'users.reset_password'))
$$;
revoke execute on function public.account_capabilities(uuid,uuid) from public,anon,authenticated;
grant execute on function public.account_capabilities(uuid,uuid) to service_role;
create function public.bootstrap_super_admin(target uuid,display_name text,account_email text) returns void language plpgsql security definer set search_path = '' as $$
 begin
 perform 1 from private.authority_lock where id=1 for update;
 if exists(select 1 from public.system_roles where role='super_admin') then raise exception 'Bootstrap is already complete'; end if;
 insert into public.profiles(id,full_name,email) values(target,display_name,account_email);
 insert into public.system_roles(user_id,role) values(target,'super_admin');
 insert into public.audit_logs(actor_id,action,target_id) values(target,'bootstrap.super_admin',target);
 end $$;
revoke execute on function public.bootstrap_super_admin(uuid,text,text) from public,anon,authenticated;
grant execute on function public.bootstrap_super_admin(uuid,text,text) to service_role;

create function public.password_abort(target uuid,token uuid) returns void language sql security definer set search_path = '' as $$
 update public.profiles set must_change_password=true,password_operation=null,password_operation_at=null where id=target and password_operation=token
$$;
revoke execute on function public.password_abort(uuid,uuid) from public,anon,authenticated;
grant execute on function public.password_abort(uuid,uuid) to service_role;
create function public.membership_capability(actor uuid,target uuid,branch uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select private.ready(actor) and exists(select 1 from public.branches where id=branch and active) and (
 private.global_role(actor) is not distinct from 'super_admin' or
 (private.global_role(actor) is not distinct from 'admin' and not exists(select 1 from public.system_roles where user_id=target)) or
 (private.global_role(actor) is null and actor<>target and private.manager(actor,branch) and private.can(actor,branch,'memberships.manage') and private.can(actor,branch,'roles.assign') and not exists(select 1 from public.system_roles where user_id=target) and not exists(select 1 from public.memberships where user_id=target and branch_id=branch and is_manager)))
$$;
create function public.role_capability(actor uuid,target uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.branch_roles r where r.id=target and private.ready(actor) and exists(select 1 from public.branches where id=r.branch_id and active) and (
 private.global_role(actor) is not null or (private.manager(actor,r.branch_id) and private.can(actor,r.branch_id,'roles.manage') and private.delegable(actor,r.id,r.branch_id) and not exists(
 select 1 from public.membership_roles mr join public.memberships m on m.id=mr.membership_id where mr.role_id=r.id and (m.user_id=actor or m.is_manager or exists(select 1 from public.system_roles where user_id=m.user_id))))))
$$;
revoke execute on function public.membership_capability(uuid,uuid,uuid),public.role_capability(uuid,uuid) from public,anon,authenticated;
grant execute on function public.membership_capability(uuid,uuid,uuid),public.role_capability(uuid,uuid) to service_role;
