# WhatsApp Plus — Launch QA

This checklist is the release gate for the current beta branch.

## Automated gates

- [x] GitHub CI builds the Next.js application on the review branch.
- [x] Supabase RLS isolates tenant-owned tables.
- [x] Internal tables are explicitly denied to authenticated clients.
- [x] Feature entitlements are enforced in UI, server actions, workers, and media upload RLS.
- [x] Monthly send quota is enforced on direct Inbox sends and bounded in worker claims.
- [x] Automation routes require the shared automation secret.
- [x] Admin routes require membership in `admin_users`.
- [x] Broadcast XLSX parser requires an authenticated Supabase JWT.
- [x] Media cleanup is bounded and idempotent.
- [x] Legal consent timestamp/version is recorded on signup.

## Pre-GREEN product QA

### Auth
- [ ] Sign up with a fresh email.
- [ ] Confirm email and verify callback returns to the app.
- [ ] Sign in / sign out.
- [ ] Forgot password and reset password.
- [ ] Verify protected routes redirect unauthenticated users to login.
- [ ] Enable Supabase leaked-password protection before commercial launch.

### Multi-tenant
Use two different test users.
- [ ] User A cannot read or mutate User B scheduled messages.
- [ ] User A cannot read or mutate User B campaigns or broadcasts.
- [ ] User A cannot read User B alerts, limits, connection, logs, or media folder.
- [ ] User A cannot access `/admin` or Admin server actions.
- [ ] Admin can inspect both accounts without exposing provider tokens in UI.

### Plans, billing and features
- [ ] Create/edit a plan from `/admin/plans`.
- [ ] Apply a mock billing event from a customer Admin page.
- [ ] Verify plan limits update automatically.
- [ ] Add a paid feature and verify it appears.
- [ ] Remove paid feature and verify it disappears.
- [ ] Apply Admin allow override and verify it wins over plan/billing.
- [ ] Apply Admin deny override and verify it wins over plan/billing.
- [ ] Set Past Due / Cancelled and verify sends are blocked.

### Scheduler
- [ ] Create Israel-local future send.
- [ ] Edit it.
- [ ] Cancel it.
- [ ] Send Now on a one-off message.
- [ ] Send Now on recurring message and verify recurrence remains intact.
- [ ] Retry a failed message.
- [ ] Verify media disabled plan cannot upload/send media.

### Group Publisher
- [ ] Only active + user-enabled groups can be selected.
- [ ] Create/edit/pause/resume/cancel campaign.
- [ ] Holiday Guard off/on according to entitlement.
- [ ] Holiday skip is shown as skipped in delivery history.
- [ ] Three preparation failures pause the campaign and create an alert.

### Broadcasts
- [ ] Paste recipient list.
- [ ] Import CSV / TXT.
- [ ] Import XLSX.
- [ ] Deduplicate phone numbers.
- [ ] Remove recipient from preview.
- [ ] Personalization with `{{name}}` and `{{שם}}`.
- [ ] Pause/resume/cancel.
- [ ] Retry one failed recipient.
- [ ] Retry all failed recipients.
- [ ] Export CSV results.
- [ ] Verify campaign respects package recipient limit and monthly send quota.

### Inbox
- [ ] Chat list loads.
- [ ] Search works.
- [ ] Incoming/outgoing direction matches GREEN `type`.
- [ ] History refresh works.
- [ ] Text send.
- [ ] Media send.
- [ ] Quota reached blocks direct Inbox send.
- [ ] Embedded tab appears only when entitled and a secure URL is configured.

### Alerts and maintenance
- [ ] WhatsApp disconnected alert.
- [ ] 80% quota warning.
- [ ] quota reached warning.
- [ ] failed sends warning.
- [ ] paused campaign warning.
- [ ] broadcast error warning.
- [ ] mark one/all alerts read.
- [ ] media older than 30 days is removed by maintenance.

## GREEN approval gate

When GREEN Partner is approved:

1. Add `GREEN_API_PARTNER_TOKEN` and `GREEN_API_PARTNER_API_URL` to server secrets.
2. If GREEN provides a secure tokenless/signed Embedded Chats URL, add `GREEN_API_EMBEDDED_CHATS_URL`. Never expose `apiTokenInstance` in the browser.
3. Create a fresh customer and verify Partner instance creation.
4. Scan QR and verify connection state + phone number.
5. Sync WhatsApp groups.
6. Run one real Scheduler send, one Broadcast, one Group Publisher send, media send, retry, disconnect/reconnect.
7. Verify Make Wake no longer returns 404 after the new app build is deployed.
8. Run one final Preview deployment and mobile/desktop smoke test.
9. Only after approval, merge/promote to production.

## Release rule

Do not merge the review branch or promote a deployment to production until every applicable item above is green.
