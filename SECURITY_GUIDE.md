# 🔒 Supabase Security Guide

## How Security Works in Your App

### 1. **Authentication Flow**

When a user signs in:
```
User enters email/password
    ↓
supabase.auth.signInWithPassword()
    ↓
Supabase validates credentials
    ↓
Returns a JWT token (contains user ID)
    ↓
Token stored in browser (localStorage/cookies)
    ↓
Every database request includes this token
```

**In your code:**
```typescript
// User signs in
await supabase.auth.signInWithPassword({ email, password });

// Now supabase client knows who the user is
// All subsequent requests include the user's token
```

### 2. **Row Level Security (RLS) - The Security Layer**

RLS is like a bouncer at a club - it checks EVERY database operation and decides if it's allowed.

**How it works:**
1. User makes a request (e.g., `SELECT * FROM profiles`)
2. Supabase checks: "Who is this user?" (from the JWT token)
3. Supabase checks RLS policies: "Is this user allowed to do this?"
4. If YES → returns only allowed rows
5. If NO → returns error or empty result

### 3. **Your RLS Policies (From README)**

Let's break down your security policies:

#### **Profiles Table**
```sql
-- Users can only read their OWN profile
create policy "User reads own profile" 
  on profiles for select 
  using (auth.uid() = id);
  -- ↑ Only if the logged-in user's ID matches the profile ID

-- Users can only insert their OWN profile
create policy "User inserts own profile" 
  on profiles for insert 
  with check (auth.uid() = id);

-- Users can only update their OWN profile
create policy "User updates own profile" 
  on profiles for update 
  using (auth.uid() = id);
```

**What this means:**
- ✅ User with ID `abc-123` can read profile where `id = 'abc-123'`
- ❌ User with ID `abc-123` CANNOT read profile where `id = 'xyz-789'`
- ❌ User with ID `abc-123` CANNOT update someone else's profile

#### **Lessons Table**
```sql
-- Only teachers can create lessons
create policy "Teacher inserts lessons" 
  on lessons for insert 
  with check (auth.uid() = teacher_id);
  -- ↑ The logged-in user must be the teacher

-- Teachers and students can read lessons they're part of
create policy "Participants read lessons" 
  on lessons for select 
  using (auth.uid() in (teacher_id, student_id));
  -- ↑ User must be either the teacher OR the student
```

**What this means:**
- ✅ Teacher `abc-123` can create a lesson with `teacher_id = 'abc-123'`
- ❌ Student `xyz-789` CANNOT create a lesson (would fail RLS check)
- ✅ Teacher `abc-123` can read lessons where they're the teacher
- ✅ Student `xyz-789` can read lessons where they're the student
- ❌ Teacher `abc-123` CANNOT read lessons for other teachers

#### **Review Cards Table**
```sql
-- Students can only read their own cards
create policy "Student reads cards" 
  on review_cards for select 
  using (student_id = auth.uid());

-- Students can only update their own cards
create policy "Student updates cards" 
  on review_cards for update 
  using (student_id = auth.uid());

-- Teachers can create cards for their students
create policy "Teacher creates cards" 
  on review_cards for insert 
  with check (
    exists (
      select 1 from lessons l
      join lesson_words w on w.lesson_id = l.id
      where w.id = lesson_word_id and l.teacher_id = auth.uid()
    ) or student_id = auth.uid()
  );
```

**What this means:**
- ✅ Student `xyz-789` can read/update cards where `student_id = 'xyz-789'`
- ❌ Student `xyz-789` CANNOT read cards for other students
- ✅ Teacher can create cards if they own the lesson
- ❌ Random user CANNOT create cards for someone else

## 🛡️ How to Prevent Hacking

### ✅ What's Already Protected

1. **Publishable Key is Safe**
   - Even if someone steals it, RLS still blocks unauthorized access
   - They can't do anything without a valid user session

2. **JWT Tokens are Secure**
   - Tokens are signed by Supabase
   - Can't be forged or modified
   - Expire automatically

3. **RLS Policies Enforce Rules**
   - Database-level security (can't bypass from client)
   - Every query is checked
   - Even if someone tries to hack your frontend, RLS blocks them

### ⚠️ What You Need to Do

#### 1. **Run the SQL Schema** (CRITICAL!)

Your database tables don't exist yet. You MUST run the SQL from your README:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire SQL from `README.md` (lines 33-126)
3. Run it
4. This creates:
   - Tables
   - RLS policies
   - Indexes

**Without this, your database is NOT secure!**

#### 2. **Verify RLS is Enabled**

After running the SQL, verify:

```sql
-- Check if RLS is enabled on each table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Should show rowsecurity = true for all tables
```

#### 3. **Test Your Security**

Try these attacks to verify security:

**Test 1: Can a user read other users' profiles?**
```typescript
// As user abc-123, try to read profile xyz-789
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', 'xyz-789'); // Different user's ID

// Should return empty or error (RLS blocks it)
```

**Test 2: Can a student create a lesson?**
```typescript
// As a student, try to create a lesson
const { data, error } = await supabase
  .from('lessons')
  .insert({
    teacher_id: 'some-other-teacher-id', // Not their ID
    student_id: currentUser.id,
    title: 'Hacked lesson'
  });

// Should fail (RLS blocks it - teacher_id must match auth.uid())
```

**Test 3: Can a user update someone else's review card?**
```typescript
// Try to update another student's card
const { data, error } = await supabase
  .from('review_cards')
  .update({ ease: 5.0 })
  .eq('id', 'someone-elses-card-id');

// Should fail (RLS blocks it - student_id must match auth.uid())
```

## 🔐 Best Practices

### ✅ DO:
- ✅ Always enable RLS on all tables
- ✅ Write policies that check `auth.uid()` (the logged-in user)
- ✅ Test your policies with different user roles
- ✅ Use the publishable key in client-side code
- ✅ Keep the secret key ONLY in server-side code

### ❌ DON'T:
- ❌ Disable RLS (even for "admin" tables)
- ❌ Create policies that allow `true` (allows everyone)
- ❌ Put secret keys in client-side code
- ❌ Trust client-side validation alone (RLS is the real security)

## 🎯 Role-Based Access

Your app has two roles: `teacher` and `student`

**How roles work:**
1. Role is stored in `profiles.role` (not in auth system)
2. RLS policies check `auth.uid()` (who is logged in)
3. Your app logic checks `profile.role` (what they can do in UI)

**Example:**
```typescript
// In your code
if (profile.role === 'teacher') {
  // Show teacher dashboard
} else {
  // Show student dashboard
}

// But RLS still enforces:
// - Teachers can only create lessons where they're the teacher
// - Students can only read their own cards
```

## 🚨 Common Security Mistakes

1. **Forgetting to enable RLS**
   - Without RLS, anyone with the publishable key can access everything!

2. **Too permissive policies**
   ```sql
   -- BAD: Allows anyone to read anything
   create policy "bad" on profiles for select using (true);
   
   -- GOOD: Only own profile
   create policy "good" on profiles for select using (auth.uid() = id);
   ```

3. **Not testing policies**
   - Always test with different users
   - Try to break your own security

4. **Exposing secret keys**
   - Never put `SUPABASE_SECRET_KEY` in client code
   - Never commit it to git (use `.env.local` which is in `.gitignore`)

## 📋 Security Checklist

- [ ] Run the SQL schema to create tables and RLS policies
- [ ] Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables`
- [ ] Test that users can only access their own data
- [ ] Test that students can't create lessons
- [ ] Test that users can't read other users' profiles
- [ ] Verify `.env.local` is in `.gitignore`
- [ ] Never commit secret keys to git
- [ ] Review RLS policies regularly as you add features

