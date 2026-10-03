begin;
create extension if not exists pgtap with schema extensions;
select plan(40);
-- Isolated test identities; rolled back at the end. No passwords or production accounts.
insert into auth.users(id,email) values
 ('20000000-0000-4000-8000-000000000001','super@test.invalid'),
 ('20000000-0000-4000-8000-000000000002','admin@test.invalid'),
 ('20000000-0000-4000-8000-000000000003','manager@test.invalid'),
 ('20000000-0000-4000-8000-000000000004','user@test.invalid'),
 ('20000000-0000-4000-8000-000000000005','other@test.invalid'),
 ('20000000-0000-4000-8000-000000000006','new@test.invalid');
insert into public.profiles(id,email,full_name,must_change_password) select id,email,'Test staff',false from auth.users where email like '%@test.invalid';
insert into public.system_roles(user_id,role) values ('20000000-0000-4000-8000-000000000001','super_admin'),('20000000-0000-4000-8000-000000000002','admin');
insert into public.branches(id,name,code) values ('30000000-0000-4000-8000-000000000001','Security A','SEC-A'),('30000000-0000-4000-8000-000000000002','Security B','SEC-B');
select private.seed_roles('30000000-0000-4000-8000-000000000001',null);
select private.seed_roles('30000000-0000-4000-8000-000000000002',null);
insert into public.memberships(user_id,branch_id,is_manager) values
 ('20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001',true),
 ('20000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001',false),
 ('20000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000002',false);
insert into public.membership_roles(branch_id,membership_id,role_id) select m.branch_id,m.id,r.id from public.memberships m join public.branch_roles r on r.branch_id=m.branch_id and r.name=case when m.is_manager then 'Manager' else 'User' end where m.branch_id::text like '30000000%';
select ok(private.can('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','users.edit'),'Super Admin all branches');
select ok(private.can('20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','users.edit'),'Admin all branches');
select ok(private.can('20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','users.edit'),'Manager assigned branch');
select ok(not private.can('20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000002','users.edit'),'Manager denied other branch');
select ok(not private.can('20000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','users.edit'),'User cannot manage people');
select throws_ok($$select public.app_command('20000000-0000-4000-8000-000000000003','system.assign','{"id":"20000000-0000-4000-8000-000000000003","system_role":"admin"}')$$,'P0001','Access denied','Manager cannot grant global authority');
select throws_ok($$select public.app_command('20000000-0000-4000-8000-000000000002','account.save','{"id":"20000000-0000-4000-8000-000000000001","full_name":"Changed"}')$$,'P0001','Access denied','Admin cannot modify Super Admin');
-- Existing local bootstrap accounts must not invalidate last-admin fixtures. Rolled back.
update public.system_roles set active=false where user_id not in ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002');
select throws_ok($$select public.app_command('20000000-0000-4000-8000-000000000001','account.save','{"id":"20000000-0000-4000-8000-000000000001","full_name":"Super","active":false}')$$,'P0001','At least one active Super Admin is required','Last Super Admin cannot deactivate');
select throws_ok($$select public.app_command('20000000-0000-4000-8000-000000000001','system.assign','{"id":"20000000-0000-4000-8000-000000000001","system_role":"none"}')$$,'P0001','At least one active Super Admin is required','Last Super Admin cannot lose authority');
select ok(private.manage_account('20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000004','users.reset_password'),'Manager can reset in-scope User');
insert into public.memberships(user_id,branch_id) values('20000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000002');
select ok(not private.manage_account('20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000004','users.reset_password'),'Manager cannot reset multi-scope User');
select ok(not private.manage_account('20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000004','users.deactivate'),'Manager cannot deactivate multi-scope User');
-- Remove one permission from Manager: custom role updates cannot reintroduce it.
delete from public.role_permissions where role_id in(select id from public.branch_roles where branch_id='30000000-0000-4000-8000-000000000001' and name='Manager') and permission_id=(select id from public.permissions where key='users.reset_password');
select throws_ok($$select public.app_command('20000000-0000-4000-8000-000000000003','role.save','{"branch_id":"30000000-0000-4000-8000-000000000001","name":"Escalate","permissions":["users.reset_password"]}')$$,'P0001','Permission cannot be delegated','Custom role escalation denied');
-- Direct client access, including function ACLs and security flag tampering.
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',true);
select is((select count(*)::integer from public.branches),1,'RLS only assigned branch');
select is((select count(*)::integer from public.profiles where id='20000000-0000-4000-8000-000000000005'),0,'RLS hides other-branch profile');
select throws_ok($$update public.profiles set must_change_password=false where id=auth.uid()$$,'42501',null,'Direct security flag change denied');
select throws_ok($$insert into public.system_roles(user_id,role) values(auth.uid(),'super_admin')$$,'42501',null,'Direct global assignment denied');
select throws_ok($$insert into public.audit_logs(action) values('forged')$$,'42501',null,'Audit log forgery denied');
select throws_ok($$select public.app_command(auth.uid(),'profile.save','{"full_name":"Test"}')$$,'42501',null,'Service command cannot be called directly by client');
reset role;
update public.profiles set must_change_password=true where id='20000000-0000-4000-8000-000000000003';
set local role authenticated;
select is((select count(*)::integer from public.branches),0,'Forced password change blocks direct RLS data access');
reset role;
select throws_ok($$select public.app_command('20000000-0000-4000-8000-000000000003','profile.save','{"full_name":"Bypass"}')$$,'P0001','Access denied','Forced password change blocks API command');
update public.profiles set must_change_password=false,active=false where id='20000000-0000-4000-8000-000000000003';
set local role authenticated;
select is((select count(*)::integer from public.branches),0,'Deactivated existing session loses RLS access');
reset role;
select throws_ok($$select public.app_command('20000000-0000-4000-8000-000000000003','profile.save','{"full_name":"Bypass"}')$$,'P0001','Access denied','Deactivated existing session loses API access');
update public.profiles set active=true where id='20000000-0000-4000-8000-000000000003';
update public.branches set active=false where id='30000000-0000-4000-8000-000000000001';
select ok(not private.can('20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','users.view'),'Inactive branch denies scoped work');
update public.branches set active=true where id='30000000-0000-4000-8000-000000000001';
select lives_ok($$select public.app_command('20000000-0000-4000-8000-000000000003','role.save','{"branch_id":"30000000-0000-4000-8000-000000000001","name":"Reader","permissions":["branches.view"]}')$$,'Permitted custom role creation succeeds');
select is((select count(*)::integer from public.audit_logs where action='role.save' and branch_id='30000000-0000-4000-8000-000000000001'),1,'Successful changes are audited');
select ok(public.consume_rate_limit('test',1,60),'First durable rate-limit request accepted');
select ok(not public.consume_rate_limit('test',1,60),'Repeated durable rate-limit request denied');

select throws_ok($$select public.app_command('20000000-0000-4000-8000-000000000003','account.validate','{"email":"escalate@test.invalid","full_name":"Escalation","system_role":"admin","branch_id":"30000000-0000-4000-8000-000000000001"}')$$,'P0001','Access denied','Manager cannot provision Admin');
select throws_ok($$select public.app_command('20000000-0000-4000-8000-000000000003','membership.save','{"id":"20000000-0000-4000-8000-000000000004","branch_id":"30000000-0000-4000-8000-000000000001","is_manager":true,"role_ids":[]}')$$,'P0001','Access denied','Manager cannot grant Manager authority');
select throws_ok($$select public.app_command('20000000-0000-4000-8000-000000000003','membership.save','{"id":"20000000-0000-4000-8000-000000000004","branch_id":"30000000-0000-4000-8000-000000000002","role_ids":[]}')$$,'P0001','Access denied','Manager cannot change outside membership');
select lives_ok(format('select public.app_command(%L,%L,%L::jsonb)', '20000000-0000-4000-8000-000000000003','membership.save',jsonb_build_object('id','20000000-0000-4000-8000-000000000004','branch_id','30000000-0000-4000-8000-000000000001','role_ids',jsonb_build_array((select id from public.branch_roles where branch_id='30000000-0000-4000-8000-000000000001' and name='User')))),'Manager can manage only own membership of multi-branch User');
select is((select count(*)::integer from public.memberships where user_id='20000000-0000-4000-8000-000000000004' and branch_id='30000000-0000-4000-8000-000000000002'),1,'Other membership retained');
select throws_ok(format('insert into public.membership_roles(branch_id,membership_id,role_id) values(%L,%L,%L)', '30000000-0000-4000-8000-000000000001',(select id from public.memberships where user_id='20000000-0000-4000-8000-000000000004' and branch_id='30000000-0000-4000-8000-000000000001'),(select id from public.branch_roles where branch_id='30000000-0000-4000-8000-000000000002' and name='User')),'23503',null,'Composite FK blocks cross-branch roles');
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000004',true);
select is((select count(*)::integer from public.audit_logs),0,'Ordinary User has no audit access');
reset role;
select lives_ok($$select public.password_begin('20000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004',false)$$,'User can begin trusted password change');
select ok((select must_change_password from public.profiles where id='20000000-0000-4000-8000-000000000004'),'Password operation restricts business access before Auth call');
select throws_ok($$select public.password_finish('20000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','99999999-0000-4000-8000-000000000000',false)$$,'P0001','Password operation expired','Wrong token cannot release restriction');
select throws_ok($$select public.password_begin('20000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004',false)$$,'P0001','Password operation in progress','Concurrent password change blocked');
select public.password_abort('20000000-0000-4000-8000-000000000004',(select password_operation from public.profiles where id='20000000-0000-4000-8000-000000000004'));
select ok((select must_change_password and password_operation is null from public.profiles where id='20000000-0000-4000-8000-000000000004'),'Confirmed Auth failure releases lock but keeps restriction');

select * from finish();
rollback;
