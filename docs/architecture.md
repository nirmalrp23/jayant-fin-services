# Architecture and permission model

Server components read with the caller's Supabase SSR session and RLS. Proxy refreshes HttpOnly, SameSite=Lax cookies using `getUser` (Secure on HTTPS); service functions independently verify identity, active status and the mandatory-password flag. Every mutation uses a same-origin JSON POST and Zod. Forms explicitly declare POST and disable submission until hydrated, preventing the browser from placing credentials in a default GET URL. No GET request mutates application data. The server-only Admin client is never imported by client components.

`app_command` is callable only by `service_role`. It receives the actor from a verified session, independently rechecks live authority inside the database and performs writes and audit insertion in one transaction. A singleton row lock serializes permission checks/writes and last-Super-Admin protection for this modest administrative workload. UI affordances are convenience only. RLS remains authoritative for direct reads; clients have no table mutation grants or command execution rights. Native clients can share Auth/RLS and the same database command semantics through a future bearer-token service boundary; no parallel mobile role model is needed.

## Authority

Global `system_roles` contains only Super Admin and Admin. Manager is `memberships.is_manager`, scoped to one branch, independent of the assigned roles. User is the absence of global/Manager authority. Custom branch roles have only catalogued branch permissions. Multiple membership roles add permissions in that branch; no explicit deny and no cross-branch union exist.

Global administrators have all active-branch capabilities; they can still inspect and reactivate inactive branch records. Admin cannot modify any global account or assign global authority. Only Super Admin can change global roles. A database trigger prevents the last active Super Admin from being deactivated/demoted/deleted, including racing commands.

Managers require their Manager membership **and** the appropriate delegated permission for managing staff/roles/memberships. They cannot assign Manager/global authority, modify their own membership, touch protected Manager/global memberships, or delegate a permission absent from their own branch. Editing a role assigned to themselves, a Manager or a global administrator is denied. The existing role's permissions must also be within scope, so Managers cannot edit a stronger shared role into a privilege path. Branch membership edits replace only the selected branch's role set; composite foreign keys forbid cross-branch role assignment.

Account-wide edit/deactivate/reset requires all target memberships (even inactive) within active branches managed by the actor, and no target Manager/global authority. Self profile editing only changes display name. Email changes are deliberately outside this foundation.

## Passwords and sessions

Provisioning generates 24 random bytes plus password character-class guarantees on the server. The temporary value is returned once to the creator in a no-store response, held only in component state, and never written to logs/tables/browser storage. Reloading loses it; use an authorised reset if needed. `must_change_password` is set in trusted provisioning, with no client UPDATE grant.

Password begin first restricts access and reserves an operation token. Auth confirms the password update before the finish operation clears the flag. User-initiated changes use the session Auth API (including Supabase same-password/security checks); administrative resets use Admin Auth and keep the flag true. No reset of one's own temporary password is permitted: use normal password change. The browser signs out globally after a successful self change. Supabase may require recent login for password changes; sign in again if the session is too old.

A failed operation leaves the account restricted. An operation token prevents overlapping resets without an automatic timeout: an old in-flight Auth request must never race a new reset. A confirmed Auth 4xx rejection releases the reservation while retaining the restriction. An ambiguous network failure or failed finish keeps both token and restriction. After confirming no operation is in flight, a trusted operator may clear only `password_operation` and `password_operation_at` for that profile in SQL, leaving `must_change_password=true`; the user can then retry. Never clear the mandatory flag manually. Token matching prevents stale completion from clearing a newer restriction. No password/hash is stored in application tables. Deactivation is checked against live profile data for each server operation and RLS read even while an Auth token is valid. Direct Auth API password changes cannot clear the application flag. Auth metadata is never an authority source.

## Provisioning recovery

Authority is checked before Auth creation, then checked again transactionally when provisioning the profile/memberships. Failure in the database rolls back all app records and deletes the Auth account. If deletion fails, the service tries to ban it and records the Auth ID in `private.provisioning_failures`. An orphan has no profile, so server/RLS deny all business access even if banning also fails. If recording also fails, the returned error explicitly includes the recovery ID; it must not be silently discarded.

From a trusted SQL/admin environment, inspect `select * from private.provisioning_failures order by created_at;`, confirm those IDs lack profiles and delete orphan users using Supabase Auth Administration. Remove recovery queue rows only after cleanup. Also inspect Auth accounts with no matching public profile after any infrastructure outage; no automated cleanup deletes accounts. Bootstrap similarly refuses to adopt or overwrite an existing Auth identity.

## Audit and operational security

All successful administrative commands append sanitised action, actor, target, time and optional branch plus structural changes (active state, role IDs/permission keys). No plaintext passwords, Auth tokens or entire request payloads enter audit records. Application users cannot append/update/delete logs. Managers see only allowed branch audit events, and Users have none by default. Account-wide events with no branch are visible only to global admins. Account edits and administrative resets additionally append branch-scoped events for the target memberships so authorised Managers can see the relevant history.

The durable Postgres rate limiter HMACs subjects with a server secret. Login/recovery share an account bucket and an application-wide ceiling; authenticated sensitive operations use actor buckets. It fails closed on database/configuration errors. Built-in Supabase limits protect the public Auth endpoint, which clients can call independently of this app.

HTML/API responses are private/no-store, the service worker caches only an allowlist of safe files, and callback destinations are fixed. Exact Origin comparison protects cookie-based JSON mutations. CSP, frame denial, MIME sniffing protection and same-origin referrers are configured; Next.js inline scripts/styles require the included CSP allowances. Deploy behind HTTPS, keep secrets out of build logs, and rotate service credentials if exposed.
