<overview>
Plans execute autonomously. Checkpoints formalize interaction points where human verification or decisions are needed.

**Core principle:** The agent automates everything with CLI/API. Checkpoints are for verification and decisions, not manual work.

**Golden rules:**
1. **If the agent can run it, the agent runs it** - Never ask user to execute CLI commands, start servers, or run builds
2. **The agent sets up the verification environment** - Start dev servers, seed databases, configure env vars
3. **User only does what requires human judgment** - Visual checks, UX evaluation, "does this feel right?"
4. **Secrets come from user, automation comes from the agent** - Ask for API keys, then the agent uses them via CLI
5. **Auto-mode bypasses verification/decision checkpoints** — When `workflow.auto_advance` is true in config: human-verify auto-approves, decision auto-selects first option, human-action still stops (auth gates cannot be automated)
</overview>

<checkpoint_types>

<type name="human-verify">
## checkpoint:human-verify (Most Common - 90%)

**When:** The agent completed automated work, human confirms it works correctly.

**Use for:**
- Visual UI checks (layout, styling, responsiveness)
- Interactive flows (click through wizard, test user flows)
- Functional verification (feature works as expected)
- Audio/video playback quality
- Animation smoothness
- Accessibility testing

**Structure:**
```xml
<task type="checkpoint:human-verify" gate="blocking">
  <what-built>[What the agent automated and deployed/built]</what-built>
  <how-to-verify>
    [Exact steps to test - URLs, commands, expected behavior]
  </how-to-verify>
  <resume-signal>[How to continue - "approved", "yes", or describe issues]</resume-signal>
</task>
```

**Example: UI Component (shows key pattern: agent starts server BEFORE checkpoint)**
```xml
<task type="auto">
  <name>Build responsive dashboard layout</name>
  <files>src/components/Dashboard.tsx, src/app/dashboard/page.tsx</files>
  <action>Create dashboard with sidebar, header, and content area. Use Tailwind responsive classes for mobile.</action>
  <verify>npm run build succeeds, no TypeScript errors</verify>
  <done>Dashboard component builds without errors</done>
</task>

<task type="auto">
  <name>Start dev server for verification</name>
  <action>Run in terminal: `npm run dev` in background, wait for "ready" message, capture port</action>
  <verify>curl http://localhost:3000 returns 200</verify>
  <done>Dev server running at http://localhost:3000</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Responsive dashboard layout - dev server running at http://localhost:3000</what-built>
  <how-to-verify>
    Visit http://localhost:3000/dashboard and verify:
    1. Desktop (>1024px): Sidebar left, content right, header top
    2. Tablet (768px): Sidebar collapses to hamburger menu
    3. Mobile (375px): Single column layout, bottom nav appears
    4. No layout shift or horizontal scroll at any size
  </how-to-verify>
  <resume-signal>Type "approved" or describe layout issues</resume-signal>
</task>
```

**Example: Xcode Build**
```xml
<task type="auto">
  <name>Build macOS app with Xcode</name>
  <files>App.xcodeproj, Sources/</files>
  <action>Run in terminal: `xcodebuild -project App.xcodeproj -scheme App build`. Check for compilation errors in output.</action>
  <verify>Build output contains "BUILD SUCCEEDED", no errors</verify>
  <done>App builds successfully</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Built macOS app at DerivedData/Build/Products/Debug/App.app</what-built>
  <how-to-verify>
    Open App.app and test:
    - App launches without crashes
    - Menu bar icon appears
    - Preferences window opens correctly
    - No visual glitches or layout issues
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>
```
</type>

<type name="decision">
## checkpoint:decision (9%)

**When:** Human must make choice that affects implementation direction.

**Use for:**
- Technology selection (which auth provider, which database)
- Architecture decisions (monorepo vs separate repos)
- Design choices (color scheme, layout approach)
- Feature prioritization (which variant to build)
- Data model decisions (schema structure)

**Structure:**
```xml
<task type="checkpoint:decision" gate="blocking">
  <decision>[What's being decided]</decision>
  <context>[Why this decision matters]</context>
  <options>
    <option id="option-a">
      <name>[Option name]</name>
      <pros>[Benefits]</pros>
      <cons>[Tradeoffs]</cons>
    </option>
    <option id="option-b">
      <name>[Option name]</name>
      <pros>[Benefits]</pros>
      <cons>[Tradeoffs]</cons>
    </option>
  </options>
  <resume-signal>[How to indicate choice]</resume-signal>
</task>
```

**Example: Auth Provider Selection**
```xml
<task type="checkpoint:decision" gate="blocking">
  <decision>Select authentication provider</decision>
  <context>
    Need user authentication for the app. Three solid options with different tradeoffs.
  </context>
  <options>
    <option id="supabase">
      <name>Supabase Auth</name>
      <pros>Built-in with Supabase DB we're using, generous free tier, row-level security integration</pros>
      <cons>Less customizable UI, tied to Supabase ecosystem</cons>
    </option>
    <option id="clerk">
      <name>Clerk</name>
      <pros>Beautiful pre-built UI, best developer experience, excellent docs</pros>
      <cons>Paid after 10k MAU, vendor lock-in</cons>
    </option>
    <option id="nextauth">
      <name>NextAuth.js</name>
      <pros>Free, self-hosted, maximum control, widely adopted</pros>
      <cons>More setup work, you manage security updates, UI is DIY</cons>
    </option>
  </options>
  <resume-signal>Select: supabase, clerk, or nextauth</resume-signal>
</task>
```

**Example: Database Selection**
```xml
<task type="checkpoint:decision" gate="blocking">
  <decision>Select database for user data</decision>
  <context>
    App needs persistent storage for users, sessions, and user-generated content.
    Expected scale: 10k users, 1M records first year.
  </context>
  <options>
    <option id="supabase">
      <name>Supabase (Postgres)</name>
      <pros>Full SQL, generous free tier, built-in auth, real-time subscriptions</pros>
      <cons>Vendor lock-in for real-time features, less flexible than raw Postgres</cons>
    </option>
    <option id="planetscale">
      <name>PlanetScale (MySQL)</name>
      <pros>Serverless scaling, branching workflow, excellent DX</pros>
      <cons>MySQL not Postgres, no foreign keys in free tier</cons>
    </option>
    <option id="convex">
      <name>Convex</name>
      <pros>Real-time by default, TypeScript-native, automatic caching</pros>
      <cons>Newer platform, different mental model, less SQL flexibility</cons>
    </option>
  </options>
  <resume-signal>Select: supabase, planetscale, or convex</resume-signal>
</task>
```
</type>

<type name="human-action">
## checkpoint:human-action (1% - Rare)

**When:** Action has NO CLI/API and requires human-only interaction, OR the agent hit an authentication gate during automation.

**Use ONLY for:**
- **Authentication gates** - The agent tried CLI/API but needs credentials (this is NOT a failure)
- Email verification links (clicking email)
- SMS 2FA codes (phone verification)
- Manual account approvals (platform requires human review)
- Credit card 3D Secure flows (web-based payment authorization)
- OAuth app approvals (web-based approval)

**Do NOT use for pre-planned manual work:**
- Deploying (use CLI - auth gate if needed)
- Creating webhooks/databases (use API/CLI - auth gate if needed)
- Running builds/tests (run in terminal)
- Creating files (use create_file)

**Structure:**
```xml
<task type="checkpoint:human-action" gate="blocking">
  <action>[What human must do - the agent already did everything automatable]</action>
  <instructions>
    [What the agent already automated]
    [The ONE thing requiring human action]
  </instructions>
  <verification>[What the agent can check afterward]</verification>
  <resume-signal>[How to continue]</resume-signal>
</task>
```

**Example: Email Verification**
```xml
<task type="auto">
  <name>Create SendGrid account via API</name>
  <action>Use SendGrid API to create subuser account with provided email. Request verification email.</action>
  <verify>API returns 201, account created</verify>
  <done>Account created, verification email sent</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <action>Complete email verification for SendGrid account</action>
  <instructions>
    I created the account and requested verification email.
    Check your inbox for SendGrid verification link and click it.
  </instructions>
  <verification>SendGrid API key works: curl test succeeds</verification>
  <resume-signal>Type "done" when email verified</resume-signal>
</task>
```

**Example: Authentication Gate (Dynamic Checkpoint)**
```xml
<task type="auto">
  <name>Deploy to Vercel</name>
  <files>.vercel/, vercel.json</files>
  <action>Run in terminal: `vercel --yes` to deploy</action>
  <verify>vercel ls shows deployment, curl returns 200</verify>
</task>

<!-- If vercel returns "Error: Not authenticated", agent creates checkpoint on the fly -->

<task type="checkpoint:human-action" gate="blocking">
  <action>Authenticate Vercel CLI so I can continue deployment</action>
  <instructions>
    I tried to deploy but got authentication error.
    Run: vercel login
    This will open your browser - complete the authentication flow.
  </instructions>
  <verification>vercel whoami returns your account email</verification>
  <resume-signal>Type "done" when authenticated</resume-signal>
</task>

<!-- After authentication, agent retries the deployment -->

<task type="auto">
  <name>Retry Vercel deployment</name>
  <action>Run in terminal: `vercel --yes` (now authenticated)</action>
  <verify>vercel ls shows deployment, curl returns 200</verify>
</task>
```

**Key distinction:** Auth gates are created dynamically when the agent encounters auth errors. NOT pre-planned — the agent automates first, asks for credentials only when blocked.
</type>
</checkpoint_types>

<execution_protocol>

When the agent encounters `type="checkpoint:*"`:

1. **Stop immediately** - do not proceed to next task
2. **Display checkpoint clearly** using the format below
3. **Wait for user response** - do not hallucinate completion
4. **Verify if possible** - check files, run tests, whatever is specified
5. **Resume execution** - continue to next task only after confirmation

**For checkpoint:human-verify:**
```
╔═══════════════════════════════════════════════════════╗
║  CHECKPOINT: Verification Required                    ║
╚═══════════════════════════════════════════════════════╝

Progress: 5/8 tasks complete
Task: Responsive dashboard layout

Built: Responsive dashboard at /dashboard

How to verify:
  1. Visit: http://localhost:3000/dashboard
  2. Desktop (>1024px): Sidebar visible, content fills remaining space
  3. Tablet (768px): Sidebar collapses to icons
  4. Mobile (375px): Sidebar hidden, hamburger menu appears

────────────────────────────────────────────────────────
→ YOUR ACTION: Type "approved" or describe issues
────────────────────────────────────────────────────────
```

**For checkpoint:decision:**
```
╔═══════════════════════════════════════════════════════╗
║  CHECKPOINT: Decision Required                        ║
╚═══════════════════════════════════════════════════════╝

Progress: 2/6 tasks complete
Task: Select authentication provider

Decision: Which auth provider should we use?

Context: Need user authentication. Three options with different tradeoffs.

Options:
  1. supabase - Built-in with our DB, free tier
     Pros: Row-level security integration, generous free tier
     Cons: Less customizable UI, ecosystem lock-in

  2. clerk - Best DX, paid after 10k users
     Pros: Beautiful pre-built UI, excellent documentation
     Cons: Vendor lock-in, pricing at scale

  3. nextauth - Self-hosted, maximum control
     Pros: Free, no vendor lock-in, widely adopted
     Cons: More setup work, DIY security updates

────────────────────────────────────────────────────────
→ YOUR ACTION: Select supabase, clerk, or nextauth
────────────────────────────────────────────────────────
```

**For checkpoint:human-action:**
```
╔═══════════════════════════════════════════════════════╗
║  CHECKPOINT: Action Required                          ║
╚═══════════════════════════════════════════════════════╝

Progress: 3/8 tasks complete
Task: Deploy to Vercel

Attempted: vercel --yes
Error: Not authenticated. Please run 'vercel login'

What you need to do:
  1. Run: vercel login
  2. Complete browser authentication when it opens
  3. Return here when done

I'll verify: vercel whoami returns your account

────────────────────────────────────────────────────────
→ YOUR ACTION: Type "done" when authenticated
────────────────────────────────────────────────────────
```
</execution_protocol>

<authentication_gates>

**Auth gate = the agent tried CLI/API, got auth error.** Not a failure — a gate requiring human input to unblock.

**Pattern:** Agent tries automation → auth error → creates checkpoint:human-action → user authenticates → agent retries → continues

**Gate protocol:**
1. Recognize it's not a failure - missing auth is expected
2. Stop current task - don't retry repeatedly
3. Create checkpoint:human-action dynamically
4. Provide exact authentication steps
5. Verify authentication works
6. Retry the original task
7. Continue normally

**Key distinction:**
- Pre-planned checkpoint: "I need you to do X" (wrong - agent should automate)
- Auth gate: "I tried to automate X but need credentials" (correct - unblocks automation)

</authentication_gates>

<automation_reference>

**The rule:** If it has CLI/API, the agent does it. Never ask human to perform automatable work.

## Service CLI Reference

| Service | CLI/API | Key Commands | Auth Gate |
|---------|---------|--------------|-----------|
| Vercel | `vercel` | `--yes`, `env add`, `--prod`, `ls` | `vercel login` |
| Railway | `railway` | `init`, `up`, `variables set` | `railway login` |
| Fly | `fly` | `launch`, `deploy`, `secrets set` | `fly auth login` |
| Stripe | `stripe` + API | `listen`, `trigger`, API calls | API key in .env |
| Supabase | `supabase` | `init`, `link`, `db push`, `gen types` | `supabase login` |
| Upstash | `upstash` | `redis create`, `redis get` | `upstash auth login` |
| PlanetScale | `pscale` | `database create`, `branch create` | `pscale auth login` |
| GitHub | `gh` | `repo create`, `pr create`, `secret set` | `gh auth login` |
| Node | `npm`/`pnpm` | `install`, `run build`, `test`, `run dev` | N/A |
| Xcode | `xcodebuild` | `-project`, `-scheme`, `build`, `test` | N/A |
| Convex | `npx convex` | `dev`, `deploy`, `env set`, `env get` | `npx convex login` |
