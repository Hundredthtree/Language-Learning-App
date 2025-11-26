# 🔒 How Supabase Security Works - Simple Explanation

## The Big Picture

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR APP (Browser)                   │
│                                                          │
│  User signs in → Gets JWT token → Token stored locally   │
│                                                          │
│  Every request includes:                                 │
│  - The JWT token (proves who you are)                   │
│  - The publishable key (proves you're allowed to talk) │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ HTTP Request
                       │ (includes JWT token)
                       ↓
┌─────────────────────────────────────────────────────────┐
│              SUPABASE (The Security Layer)              │
│                                                          │
│  1. Receives request                                     │
│  2. Extracts JWT token                                   │
│  3. Decodes token → Gets user ID (e.g., "abc-123")     │
│  4. Checks RLS policies:                                  │
│     "Is user abc-123 allowed to do this?"                │
│  5. If YES → Execute query, return only allowed data    │
│  6. If NO → Return error or empty result               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ SQL Query (filtered by RLS)
                       ↓
┌─────────────────────────────────────────────────────────┐
│                  POSTGRES DATABASE                       │
│                                                          │
│  Returns data (already filtered by RLS)                 │
└─────────────────────────────────────────────────────────┘
```

## Real Example: Reading Profiles

### Scenario: User "Alice" (ID: `alice-123`) tries to read profiles

**What happens:**

1. **Alice's browser makes request:**
   ```typescript
   const { data } = await supabase
     .from('profiles')
     .select('*');
   ```

2. **Supabase receives request:**
   - Sees JWT token → "This is Alice (alice-123)"
   - Checks RLS policy: `auth.uid() = id`
   - Policy says: "Only return rows where the logged-in user's ID matches the profile ID"

3. **Database query (automatically modified by RLS):**
   ```sql
   -- What you wrote:
   SELECT * FROM profiles;
   
   -- What actually runs (RLS adds the filter):
   SELECT * FROM profiles WHERE id = 'alice-123';
   ```

4. **Result:**
   - ✅ Alice gets her own profile
   - ❌ Alice does NOT get Bob's profile (even if it exists)

## How RLS Policies Work

### Policy Structure:
```sql
create policy "policy_name"
  on table_name
  for operation          -- SELECT, INSERT, UPDATE, DELETE
  using (condition)     -- For SELECT/UPDATE/DELETE
  with check (condition); -- For INSERT/UPDATE
```

### Key Functions:
- `auth.uid()` - Returns the logged-in user's ID (from JWT token)
- `auth.role()` - Returns the user's role (if using Supabase roles)

### Your Policies Explained:

#### 1. Profiles - Users can only access their own
```sql
-- Read: Only your own profile
create policy "User reads own profile" 
  on profiles for select 
  using (auth.uid() = id);
```
**Translation:** "You can only SELECT profiles where the profile's `id` equals your user ID"

#### 2. Lessons - Teachers create, both can read
```sql
-- Create: Only if you're the teacher
create policy "Teacher inserts lessons" 
  on lessons for insert 
  with check (auth.uid() = teacher_id);

-- Read: If you're the teacher OR student
create policy "Participants read lessons" 
  on lessons for select 
  using (auth.uid() in (teacher_id, student_id));
```
**Translation:** 
- "You can INSERT a lesson only if `teacher_id` is your user ID"
- "You can SELECT lessons where you're either the teacher OR the student"

#### 3. Review Cards - Students own their cards
```sql
-- Read: Only your own cards
create policy "Student reads cards" 
  on review_cards for select 
  using (student_id = auth.uid());

-- Update: Only your own cards
create policy "Student updates cards" 
  on review_cards for update 
  using (student_id = auth.uid());
```
**Translation:** "You can only read/update cards where `student_id` is your user ID"

## 🚨 What Happens Without RLS?

**If RLS is NOT enabled:**
```typescript
// Anyone with the publishable key can do this:
const { data } = await supabase
  .from('profiles')
  .select('*');
// Returns ALL profiles (everyone's data!)
```

**With RLS enabled:**
```typescript
// Same code, but RLS filters it:
const { data } = await supabase
  .from('profiles')
  .select('*');
// Returns ONLY your profile
```

## 🔐 How Roles Work

Your app has roles (`teacher`, `student`), but they're stored in the `profiles` table, not in Supabase Auth.

**How it works:**
1. User signs in → Gets JWT token with user ID
2. App loads profile → Gets `role` from `profiles` table
3. UI shows different features based on `role`
4. RLS policies enforce security based on `auth.uid()` (who you are)

**Example:**
```typescript
// User signs in as Alice
const { data: { user } } = await supabase.auth.signInWithPassword(...);
// user.id = "alice-123"

// Load profile to get role
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();
// profile.role = "teacher"

// Show teacher dashboard
if (profile.role === 'teacher') {
  // Show teacher UI
} else {
  // Show student UI
}

// But RLS still enforces:
// - Alice can only create lessons where teacher_id = "alice-123"
// - Alice can only read lessons where she's the teacher or student
```

## 🛡️ Security Layers

Your app has **multiple layers** of security:

1. **Authentication** (Who are you?)
   - Email/password validation
   - JWT token generation
   - Token validation on every request

2. **Authorization** (What can you do?)
   - RLS policies check every query
   - Database-level enforcement (can't bypass)

3. **Application Logic** (What should you see?)
   - UI shows/hides features based on role
   - Client-side validation (user experience)
   - But RLS is the real security!

## ⚠️ IMPORTANT: You Need to Set This Up!

**Your database is currently empty!** You need to:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the SQL from `README.md` (the entire schema)
3. Run it
4. This creates:
   - All tables
   - All RLS policies
   - All indexes

**Without this, your app won't work and your database is NOT secure!**

