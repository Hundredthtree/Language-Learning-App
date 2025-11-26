-- Migration: create_language_app_schema
-- Version: 20251126000736
-- Description: Initial schema for language learning app with teachers, students, lessons, and spaced repetition

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Create profiles table (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  role text not null check (role in ('teacher','student')),
  created_at timestamptz default now()
);

-- Create teacher_students linking table
create table teacher_students (
  teacher_id uuid references profiles(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (teacher_id, student_id)
);

-- Create lessons table
create table lessons (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references profiles(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  title text,
  started_at timestamptz default now()
);

-- Create lesson_words table
create table lesson_words (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid references lessons(id) on delete cascade,
  term text not null,
  translation text,
  note text,
  created_at timestamptz default now()
);

-- Create review_cards table for spaced repetition
create table review_cards (
  id uuid primary key default uuid_generate_v4(),
  lesson_word_id uuid references lesson_words(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  ease numeric default 2.5,
  interval_days integer default 0,
  repetitions integer default 0,
  due_at timestamptz default now(),
  total_success integer default 0,
  total_fail integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_lessons_student_id on lessons(student_id);
create index idx_lessons_teacher_id on lessons(teacher_id);
create index idx_teacher_students_teacher_id on teacher_students(teacher_id);
create index idx_teacher_students_student_id on teacher_students(student_id);
create index idx_lesson_words_lesson_id on lesson_words(lesson_id);
create index idx_review_cards_student_id on review_cards(student_id);
create index idx_review_cards_due_at on review_cards(due_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table teacher_students enable row level security;
alter table lessons enable row level security;
alter table lesson_words enable row level security;
alter table review_cards enable row level security;

-- Profiles policies: Users can only access their own profile
create policy "User reads own profile" on profiles for select using (auth.uid() = id);
create policy "User inserts own profile" on profiles for insert with check (auth.uid() = id);
create policy "User updates own profile" on profiles for update using (auth.uid() = id);

-- Teacher_students policies: Teachers manage their student links
create policy "Teacher manages links" on teacher_students
  for insert with check (auth.uid() = teacher_id);
create policy "Teacher reads links" on teacher_students
  for select using (auth.uid() = teacher_id);

-- Lessons policies: Teachers create, both participants can read
create policy "Teacher inserts lessons" on lessons for insert with check (auth.uid() = teacher_id);
create policy "Participants read lessons" on lessons for select using (auth.uid() in (teacher_id, student_id));

-- Lesson_words policies: Teachers create words, participants can read
create policy "Teacher inserts words" on lesson_words for insert with check (
  exists (select 1 from lessons l where l.id = lesson_id and l.teacher_id = auth.uid())
);
create policy "Lesson participants read words" on lesson_words for select using (
  exists (
    select 1 from lessons l where l.id = lesson_id
    and (l.teacher_id = auth.uid() or l.student_id = auth.uid())
  )
);

-- Review_cards policies: Students own their cards, teachers can create
create policy "Student reads cards" on review_cards for select using (student_id = auth.uid());
create policy "Student updates cards" on review_cards for update using (student_id = auth.uid());
create policy "Teacher creates cards" on review_cards for insert with check (
  exists (
    select 1 from lessons l
    join lesson_words w on w.lesson_id = l.id
    where w.id = lesson_word_id and l.teacher_id = auth.uid()
  ) or student_id = auth.uid()
);

