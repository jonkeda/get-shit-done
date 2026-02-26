# Verification Patterns

How to verify different types of artifacts are real implementations, not stubs or placeholders.

<core_principle>
**Existence ≠ Implementation**

A file existing does not mean the feature works. Verification must check:
1. **Exists** - File is present at expected path
2. **Substantive** - Content is real implementation, not placeholder
3. **Wired** - Connected to the rest of the system
4. **Functional** - Actually works when invoked

Levels 1-3 can be checked programmatically. Level 4 often requires human verification.
</core_principle>

<stub_detection>

## Universal Stub Patterns

These patterns indicate placeholder code regardless of file type:

**Comment-based stubs:**
```bash
# Grep patterns for stub comments
grep -E "(TODO|FIXME|XXX|HACK|PLACEHOLDER)" "$file"
grep -E "implement|add later|coming soon|will be" "$file" -i
grep -E "// \.\.\.|/\* \.\.\. \*/|# \.\.\." "$file"
```

**Placeholder text in output:**
```bash
# UI placeholder patterns
grep -E "placeholder|lorem ipsum|coming soon|under construction" "$file" -i
grep -E "sample|example|test data|dummy" "$file" -i
grep -E "\[.*\]|<.*>|\{.*\}" "$file"  # Template brackets left in
```

**Empty or trivial implementations:**
```bash
# Functions that do nothing
grep -E "return null|return undefined|return \{\}|return \[\]" "$file"
grep -E "pass$|\.\.\.|\bnothing\b" "$file"
grep -E "console\.(log|warn|error).*only" "$file"  # Log-only functions
```

**Hardcoded values where dynamic expected:**
```bash
# Hardcoded IDs, counts, or content
grep -E "id.*=.*['\"].*['\"]" "$file"  # Hardcoded string IDs
grep -E "count.*=.*\d+|length.*=.*\d+" "$file"  # Hardcoded counts
grep -E "\\\$\d+\.\d{2}|\d+ items" "$file"  # Hardcoded display values
```

</stub_detection>

<react_components>

## React/Next.js Components

**Existence check:**
```bash
[ -f "$component_path" ] && grep -E "export (default |)function|export const.*=.*\(" "$component_path"
```

**Substantive check:**
```bash
grep -E "return.*<" "$component_path" | grep -v "return.*null" | grep -v "placeholder" -i
grep -E "<[A-Z][a-zA-Z]+|className=|onClick=|onChange=" "$component_path"
grep -E "props\.|useState|useEffect|useContext|\{.*\}" "$component_path"
```

**Stub patterns specific to React:**
```javascript
// RED FLAGS - These are stubs:
return <div>Component</div>
return <div>Placeholder</div>
return <div>{/* TODO */}</div>
return <p>Coming soon</p>
return null
return <></>

// Also stubs - empty handlers:
onClick={() => {}}
onChange={() => console.log('clicked')}
onSubmit={(e) => e.preventDefault()}  // Only prevents default, does nothing
```

**Wiring check:**
```bash
grep -E "^import.*from" "$component_path"
grep -E "\{ .* \}.*props|\bprops\.[a-zA-Z]+" "$component_path"
grep -E "fetch\(|axios\.|useSWR|useQuery|getServerSideProps|getStaticProps" "$component_path"
```

</react_components>

<api_routes>

## API Routes (Next.js App Router / Express / etc.)

**Existence check:**
```bash
[ -f "$route_path" ]
grep -E "export (async )?(function|const) (GET|POST|PUT|PATCH|DELETE)" "$route_path"
grep -E "\.(get|post|put|patch|delete)\(" "$route_path"
```

**Substantive check:**
```bash
wc -l "$route_path"  # More than 10-15 lines suggests real implementation
grep -E "prisma\.|db\.|mongoose\.|sql|query|find|create|update|delete" "$route_path" -i
grep -E "try|catch|throw|error|Error" "$route_path"
grep -E "Response\.json|res\.json|res\.send|return.*\{" "$route_path" | grep -v "message.*not implemented" -i
```

**Stub patterns specific to API routes:**
```typescript
// RED FLAGS - These are stubs:
export async function POST() {
  return Response.json({ message: "Not implemented" })
}

export async function GET() {
  return Response.json([])  // Empty array with no DB query
}

export async function PUT() {
  return new Response()  // Empty response
}

// Console log only:
export async function POST(req) {
  console.log(await req.json())
  return Response.json({ ok: true })
}
```

**Wiring check:**
```bash
grep -E "^import.*prisma|^import.*db|^import.*client" "$route_path"
grep -E "req\.json\(\)|req\.body|request\.json\(\)" "$route_path"
grep -E "schema\.parse|validate|zod|yup|joi" "$route_path"
```

</api_routes>

<database_schema>

## Database Schema (Prisma / Drizzle / SQL)

**Existence check:**
```bash
[ -f "prisma/schema.prisma" ] || [ -f "drizzle/schema.ts" ] || [ -f "src/db/schema.sql" ]
grep -E "^model $model_name|CREATE TABLE $table_name|export const $table_name" "$schema_path"
```

**Substantive check:**
```bash
grep -A 20 "model $model_name" "$schema_path" | grep -E "^\s+\w+\s+\w+"
grep -E "@relation|REFERENCES|FOREIGN KEY" "$schema_path"
grep -A 20 "model $model_name" "$schema_path" | grep -E "Int|DateTime|Boolean|Float|Decimal|Json"
```

**Stub patterns specific to schemas:**
```prisma
// RED FLAGS - These are stubs:
model User {
  id String @id
  // TODO: add fields
}

model Message {
  id        String @id
  content   String  // Only one real field
}
```

**Wiring check:**
```bash
ls prisma/migrations/ 2>/dev/null | wc -l  # Should be > 0
npx prisma migrate status 2>/dev/null | grep -v "pending"
[ -d "node_modules/.prisma/client" ]
```

</database_schema>

<hooks_utilities>

## Custom Hooks and Utilities

**Existence check:**
```bash
[ -f "$hook_path" ] && grep -E "export (default )?(function|const)" "$hook_path"
```

**Substantive check:**
```bash
grep -E "useState|useEffect|useCallback|useMemo|useRef|useContext" "$hook_path"
grep -E "return \{|return \[" "$hook_path"
[ $(wc -l < "$hook_path") -gt 10 ]
```

**Stub patterns specific to hooks:**
```typescript
// RED FLAGS - These are stubs:
export function useAuth() {
  return { user: null, login: () => {}, logout: () => {} }
}

export function useCart() {
  const [items, setItems] = useState([])
  return { items, addItem: () => console.log('add'), removeItem: () => {} }
}

// Hardcoded return:
export function useUser() {
  return { name: "Test User", email: "test@example.com" }
}
```

**Wiring check:**
```bash
grep -r "import.*$hook_name" src/ --include="*.tsx" --include="*.ts" | grep -v "$hook_path"
grep -r "$hook_name()" src/ --include="*.tsx" --include="*.ts" | grep -v "$hook_path"
```

</hooks_utilities>

<environment_config>

## Environment Variables and Configuration

**Existence check:**
```bash
[ -f ".env" ] || [ -f ".env.local" ]
grep -E "^$VAR_NAME=" .env .env.local 2>/dev/null
```

**Substantive check:**
```bash
grep -E "^$VAR_NAME=.+" .env .env.local 2>/dev/null | grep -v "your-.*-here|xxx|placeholder|TODO" -i
```

**Stub patterns specific to env:**
```bash
# RED FLAGS - These are stubs:
DATABASE_URL=your-database-url-here
STRIPE_SECRET_KEY=sk_test_xxx
API_KEY=placeholder
NEXT_PUBLIC_API_URL=http://localhost:3000  # Still pointing to localhost in prod
```

**Wiring check:**
```bash
grep -r "process\.env\.$VAR_NAME|env\.$VAR_NAME" src/ --include="*.ts" --include="*.tsx"
grep -E "$VAR_NAME" src/env.ts src/env.mjs 2>/dev/null
```

</environment_config>

<wiring_verification>

## Wiring Verification Patterns

Wiring verification checks that components actually communicate. This is where most stubs hide.

### Pattern: Component → API
```bash
grep -E "fetch\(['\"].*$api_path|axios\.(get|post).*$api_path" "$component_path"
grep -E "fetch\(|axios\." "$component_path" | grep -v "^.*//.*fetch"
grep -E "await.*fetch|\.then\(|setData|setState" "$component_path"
```

### Pattern: API → Database
```bash
grep -E "prisma\.$model|db\.query|Model\.find" "$route_path"
grep -E "await.*prisma|await.*db\." "$route_path"
grep -E "return.*json.*data|res\.json.*result" "$route_path"
```

### Pattern: Form → Handler
```bash
grep -E "onSubmit=\{|handleSubmit" "$component_path"
grep -A 10 "onSubmit.*=" "$component_path" | grep -E "fetch|axios|mutate|dispatch"
grep -A 5 "onSubmit" "$component_path" | grep -v "only.*preventDefault" -i
```

### Pattern: State → Render
```bash
grep -E "\{.*messages.*\}|\{.*data.*\}|\{.*items.*\}" "$component_path"
grep -E "\.map\(|\.filter\(|\.reduce\(" "$component_path"
grep -E "\{[a-zA-Z_]+\." "$component_path"
```

</wiring_verification>

<verification_checklist>

## Quick Verification Checklist

### Component Checklist
- [ ] File exists at expected path
- [ ] Exports a function/const component
- [ ] Returns JSX (not null/empty)
- [ ] No placeholder text in render
- [ ] Uses props or state (not static)
- [ ] Event handlers have real implementations
- [ ] Imports resolve correctly
- [ ] Used somewhere in the app

### API Route Checklist
- [ ] File exists at expected path
- [ ] Exports HTTP method handlers
- [ ] Handlers have more than 5 lines
- [ ] Queries database or service
- [ ] Returns meaningful response (not empty/placeholder)
- [ ] Has error handling
- [ ] Validates input
- [ ] Called from frontend

### Schema Checklist
- [ ] Model/table defined
- [ ] Has all expected fields
- [ ] Fields have appropriate types
- [ ] Relationships defined if needed
- [ ] Migrations exist and applied
