# 📁 Database Migrations Guide

## What is a Migration?

A migration is a **versioned SQL file** that changes your database schema. Think of it like a Git commit, but for your database.

```
┌─────────────────────────────────────────────────────────┐
│                    Your Codebase                         │
│                                                          │
│  Git History:                                            │
│  ├── commit 1: "Initial app setup"                      │
│  ├── commit 2: "Add login page"                         │
│  └── commit 3: "Add user settings"                      │
│                                                          │
│  Migration History:                                      │
│  ├── 20251126000736: "create_language_app_schema"       │
│  ├── (future): "add_categories_to_words"                │
│  └── (future): "add_user_settings_table"                │
└─────────────────────────────────────────────────────────┘
```

## Why Migrations?

| Without Migrations | With Migrations |
|-------------------|-----------------|
| "I manually changed the database" | "I created a migration file" |
| Other devs don't know about it | Other devs run the migration |
| Production is different from dev | Production runs the same migrations |
| Can't recreate the database | Can recreate from scratch |
| No history of changes | Full history of every change |

## Your Current Migrations

```
supabase/migrations/
└── 20251126000736_create_language_app_schema.sql  ← Initial schema
```

This migration created:
- `profiles` table
- `teacher_students` table
- `lessons` table
- `lesson_words` table
- `review_cards` table
- All RLS policies
- All indexes

## How to Add a New Migration

### Option 1: Using MCP Tools (Recommended)

When you ask me to change the database, I use `apply_migration` which:
1. Creates the migration in Supabase
2. Applies it immediately
3. Tracks it in `supabase_migrations.schema_migrations`

Then I create the local `.sql` file for your Git repo.

### Option 2: Manual Process

1. **Create the migration file:**
```bash
# File naming: YYYYMMDDHHMMSS_description.sql
touch supabase/migrations/20251127120000_add_categories.sql
```

2. **Write the SQL:**
```sql
-- supabase/migrations/20251127120000_add_categories.sql

-- Add categories table
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

-- Add category_id to lesson_words
alter table lesson_words add column category_id uuid references categories(id);
```

3. **Apply via Supabase Dashboard:**
   - Go to SQL Editor
   - Paste and run the SQL

4. **Or ask me to apply it:**
   - I'll use `apply_migration` to run it and track it

## Migration Best Practices

### ✅ DO:

1. **One logical change per migration**
```
Good:
├── 20251126_create_users.sql
├── 20251127_create_posts.sql
└── 20251128_add_likes_to_posts.sql

Bad:
└── 20251126_everything.sql  ← Too much in one file
```

2. **Use descriptive names**
```
Good: 20251126_add_email_verification_to_users.sql
Bad:  20251126_update.sql
```

3. **Include comments**
```sql
-- Migration: add_categories
-- Why: Users requested organizing words by topic
-- What: Creates categories table, links to lesson_words

create table categories (...);
```

4. **Test locally first**
   - Use Supabase local development (optional)
   - Or test on a branch database

### ❌ DON'T:

1. **Don't modify existing migrations**
   - Once applied, migrations are immutable
   - Create a new migration to fix issues

2. **Don't delete data without backup**
```sql
-- DANGEROUS: Deleting column loses data
alter table users drop column bio;

-- SAFER: Rename first, delete later after confirming
alter table users rename column bio to bio_deprecated;
-- Later migration: alter table users drop column bio_deprecated;
```

3. **Don't forget RLS policies**
   - New tables need RLS enabled
   - New tables need policies

## The Migration Workflow

```
┌─────────────────────────────────────────────────────────┐
│ 1. You need a database change                           │
│    "I want to add categories to words"                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Create migration                                      │
│    - Write SQL for the change                           │
│    - Name it: 20251127_add_categories.sql               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Apply migration                                       │
│    - Via MCP tools (I do this)                          │
│    - Or via Supabase Dashboard                          │
│    - Or via Supabase CLI                                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Commit to Git                                         │
│    git add supabase/migrations/                         │
│    git commit -m "Add categories migration"             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Deploy                                                │
│    - Push to main branch                                │
│    - Migration runs on production                       │
└─────────────────────────────────────────────────────────┘
```

## Checking Migration Status

### See applied migrations:
```sql
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
```

### Current status:
| Version | Name | Status |
|---------|------|--------|
| 20251126000736 | create_language_app_schema | ✅ Applied |

## Rolling Back (Undoing Migrations)

Supabase doesn't have automatic rollback. To undo:

1. **Create a new migration that reverses the change:**
```sql
-- 20251128_revert_add_categories.sql
drop table if exists categories;
alter table lesson_words drop column if exists category_id;
```

2. **Apply the reversal migration**

This keeps a full history of what happened.

## Local Development (Optional)

For serious development, you can run Supabase locally:

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize (in your project)
supabase init

# Start local Supabase
supabase start

# Apply migrations locally
supabase db reset

# Generate types after schema changes
supabase gen types typescript --local > src/types/database.ts
```

This gives you:
- Local Postgres database
- Local Supabase dashboard
- Migration testing before production
- Type generation

## Summary

| Concept | What it is |
|---------|------------|
| Migration | A versioned SQL file that changes the database |
| Version | Timestamp when migration was created (YYYYMMDDHHMMSS) |
| Apply | Running the migration SQL on the database |
| Track | Recording that a migration was applied |
| Rollback | Creating a new migration that undoes a previous one |

Your migrations are now tracked in:
- **Supabase**: `supabase_migrations.schema_migrations` table
- **Git**: `supabase/migrations/*.sql` files

