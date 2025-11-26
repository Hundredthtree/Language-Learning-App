# When Do You Need the Secret Key?

## ✅ You DON'T Need It For:
- ✅ User sign-up/sign-in (auth works with publishable key)
- ✅ Users inserting their own data (your app already does this!)
- ✅ Users updating their own data (your app already does this!)
- ✅ Any operation where RLS policies allow the user to do it

## ❌ You DO Need It For:

### 1. **Server-Side Operations Without User Context**
```typescript
// app/api/admin/stats/route.ts
import { supabaseServer } from '@/lib/supabaseServer';

// This runs on the server, no user logged in
export async function GET() {
  // Need secret key to bypass RLS and get all data
  const { data } = await supabaseServer
    .from('lessons')
    .select('*'); // Gets ALL lessons, not just user's
  return Response.json(data);
}
```

### 2. **Background Jobs / Cron Jobs**
```typescript
// app/api/cron/cleanup/route.ts
// Runs automatically, no user session
export async function GET() {
  // Clean up old data - needs secret key
  await supabaseServer
    .from('review_cards')
    .delete()
    .lt('due_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
}
```

### 3. **Admin Operations**
```typescript
// app/api/admin/users/route.ts
// Admin needs to see all users, not just their own
export async function GET() {
  const { data } = await supabaseServer
    .from('profiles')
    .select('*'); // Gets ALL profiles
  return Response.json(data);
}
```

### 4. **Server Components (Next.js 13+)**
```typescript
// app/lessons/page.tsx (Server Component)
import { supabaseServer } from '@/lib/supabaseServer';

export default async function LessonsPage() {
  // Fetches on server before rendering
  const { data } = await supabaseServer
    .from('lessons')
    .select('*');
  return <LessonsList lessons={data} />;
}
```

## Your Current App

Your app is **100% client-side** and uses the **publishable key** for everything:
- ✅ Sign up → uses publishable key
- ✅ Create lessons → uses publishable key (RLS allows it)
- ✅ Add words → uses publishable key (RLS allows it)
- ✅ Update review cards → uses publishable key (RLS allows it)

**You don't need the secret key right now!**

## When You Might Add It Later

If you add:
- Admin dashboard (needs to see all data)
- Analytics API route (aggregates all data)
- Background cleanup jobs
- Server-side rendering of initial data

Then you'd use `supabaseServer` from `@/lib/supabaseServer.ts`.

