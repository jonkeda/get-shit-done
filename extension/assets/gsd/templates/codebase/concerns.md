# Codebase Concerns Template

Template for `.planning/codebase/CONCERNS.md` - captures known issues and areas requiring care.

**Purpose:** Surface actionable warnings about the codebase. Focused on "what to watch out for when making changes."

---

## File Template

```markdown
# Codebase Concerns

**Analysis Date:** [YYYY-MM-DD]

## Tech Debt

**[Area/Component]:**
- Issue: [What's the shortcut/workaround]
- Why: [Why it was done this way]
- Impact: [What breaks or degrades because of it]
- Fix approach: [How to properly address it]

**[Area/Component]:**
- Issue: [What's the shortcut/workaround]
- Why: [Why it was done this way]
- Impact: [What breaks or degrades because of it]
- Fix approach: [How to properly address it]

## Known Bugs

**[Bug description]:**
- Symptoms: [What happens]
- Trigger: [How to reproduce]
- Workaround: [Temporary mitigation if any]
- Root cause: [If known]
- Blocked by: [If waiting on something]

**[Bug description]:**
- Symptoms: [What happens]
- Trigger: [How to reproduce]
- Workaround: [Temporary mitigation if any]
- Root cause: [If known]

## Security Considerations

**[Area requiring security care]:**
- Risk: [What could go wrong]
- Current mitigation: [What's in place now]
- Recommendations: [What should be added]

**[Area requiring security care]:**
- Risk: [What could go wrong]
- Current mitigation: [What's in place now]
- Recommendations: [What should be added]

## Performance Bottlenecks

**[Slow operation/endpoint]:**
- Problem: [What's slow]
- Measurement: [Actual numbers: "500ms p95", "2s load time"]
- Cause: [Why it's slow]
- Improvement path: [How to speed it up]

**[Slow operation/endpoint]:**
- Problem: [What's slow]
- Measurement: [Actual numbers]
- Cause: [Why it's slow]
- Improvement path: [How to speed it up]

## Fragile Areas

**[Component/Module]:**
- Why fragile: [What makes it break easily]
- Common failures: [What typically goes wrong]
- Safe modification: [How to change it without breaking]
- Test coverage: [Is it tested? Gaps?]

**[Component/Module]:**
- Why fragile: [What makes it break easily]
- Common failures: [What typically goes wrong]
- Safe modification: [How to change it without breaking]
- Test coverage: [Is it tested? Gaps?]

## Scaling Limits

**[Resource/System]:**
- Current capacity: [Numbers: "100 req/sec", "10k users"]
- Limit: [Where it breaks]
- Symptoms at limit: [What happens]
- Scaling path: [How to increase capacity]

## Dependencies at Risk

**[Package/Service]:**
- Risk: [e.g., "deprecated", "unmaintained", "breaking changes coming"]
- Impact: [What breaks if it fails]
- Migration plan: [Alternative or upgrade path]

## Missing Critical Features

**[Feature gap]:**
- Problem: [What's missing]
- Current workaround: [How users cope]
- Blocks: [What can't be done without it]
- Implementation complexity: [Rough effort estimate]

## Test Coverage Gaps

**[Untested area]:**
- What's not tested: [Specific functionality]
- Risk: [What could break unnoticed]
- Priority: [High/Medium/Low]
- Difficulty to test: [Why it's not tested yet]

---

*Concerns audit: [date]*
*Update as issues are fixed or new ones discovered*
```

<good_examples>
```markdown
# Codebase Concerns

**Analysis Date:** 2025-01-20

## Tech Debt

**Database queries in React components:**
- Issue: Direct Supabase queries in 15+ page components instead of server actions
- Files: `app/dashboard/page.tsx`, `app/profile/page.tsx`, `app/courses/[id]/page.tsx`, `app/settings/page.tsx` (and 11 more in `app/`)
- Why: Rapid prototyping during MVP phase
- Impact: Can't implement RLS properly, exposes DB structure to client
- Fix approach: Move all queries to server actions in `app/actions/`, add proper RLS policies

**Manual webhook signature validation:**
- Issue: Copy-pasted Stripe webhook verification code in 3 different endpoints
- Files: `app/api/webhooks/stripe/route.ts`, `app/api/webhooks/checkout/route.ts`, `app/api/webhooks/subscription/route.ts`
- Why: Each webhook added ad-hoc without abstraction
- Impact: Easy to miss verification in new webhooks (security risk)
- Fix approach: Create shared `lib/stripe/validate-webhook.ts` middleware

## Known Bugs

**Race condition in subscription updates:**
- Symptoms: User shows as "free" tier for 5-10 seconds after successful payment
- Trigger: Fast navigation after Stripe checkout redirect, before webhook processes
- Files: `app/checkout/success/page.tsx` (redirect handler), `app/api/webhooks/stripe/route.ts` (webhook)
- Workaround: Stripe webhook eventually updates status (self-heals)
- Root cause: Webhook processing slower than user navigation, no optimistic UI update
- Fix: Add polling in `app/checkout/success/page.tsx` after redirect

**Inconsistent session state after logout:**
- Symptoms: User redirected to /dashboard after logout instead of /login
- Trigger: Logout via button in mobile nav (desktop works fine)
- File: `components/MobileNav.tsx` (line ~45, logout handler)
- Workaround: Manual URL navigation to /login works
- Root cause: Mobile nav component not awaiting supabase.auth.signOut()
- Fix: Add await to logout handler in `components/MobileNav.tsx`

## Security Considerations

**Admin role check client-side only:**
- Risk: Admin dashboard pages check isAdmin from Supabase client, no server verification
- Files: `app/admin/page.tsx`, `app/admin/users/page.tsx`, `components/AdminGuard.tsx`
- Current mitigation: None (relying on UI hiding)
- Recommendations: Add middleware to admin routes in `middleware.ts`, verify role server-side

**Unvalidated file uploads:**
- Risk: Users can upload any file type to avatar bucket (no size/type validation)
- File: `components/AvatarUpload.tsx` (upload handler)
- Current mitigation: Supabase bucket limits to 2MB (configured in dashboard)
- Recommendations: Add file type validation (image/* only) in `lib/storage/validate.ts`

## Performance Bottlenecks

**/api/courses endpoint:**
- Problem: Fetching all courses with nested lessons and authors
- File: `app/api/courses/route.ts`
- Measurement: 1.2s p95 response time with 50+ courses
- Cause: N+1 query pattern (separate query per course for lessons)
- Improvement path: Use Prisma include to eager-load lessons in `lib/db/courses.ts`, add Redis caching

**Dashboard initial load:**
- Problem: Waterfall of 5 serial API calls on mount
- File: `app/dashboard/page.tsx`
- Measurement: 3.5s until interactive on slow 3G
- Cause: Each component fetches own data independently
- Improvement path: Convert to Server Component with single parallel fetch

## Fragile Areas

**Authentication middleware chain:**
- File: `middleware.ts`
- Why fragile: 4 different middleware functions run in specific order (auth -> role -> subscription -> logging)
- Common failures: Middleware order change breaks everything, hard to debug
- Safe modification: Add tests before changing order, document dependencies in comments
- Test coverage: No integration tests for middleware chain (only unit tests)
```
</good_examples>

<guidelines>
**What belongs in CONCERNS.md:**
- Tech debt with specific file locations
- Known bugs with reproduction steps
- Security risks and mitigations
- Performance bottlenecks with measurements
- Fragile areas that need careful handling
- Dependencies at risk of deprecation/breaking
- Test coverage gaps

**What does NOT belong here:**
- Feature requests (that's ROADMAP.md)
- Architecture patterns (that's ARCHITECTURE.md)
- General improvement ideas (too vague)
- Issues without file location (not actionable)

**When filling this template:**
- Review error logs, bug trackers
- Check for TODO/FIXME/HACK comments in code
- Run security scanning tools if available
- Measure slow endpoints/operations
- Review test coverage gaps
- Ask about known issues from the user

**Useful for phase planning when:**
- Prioritizing tech debt work
- Understanding risk of changing specific areas
- Planning security improvements
- Knowing what to test more carefully
</guidelines>
