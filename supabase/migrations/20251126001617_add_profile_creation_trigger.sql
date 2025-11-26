-- Migration: add_profile_creation_trigger
-- Version: 20251126001617
-- Description: Automatically create profile when user signs up via database trigger

-- Create a function that handles new user signup
-- This runs with elevated privileges (security definer) so it can insert into profiles
-- even before the user is fully authenticated
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$;

-- Create trigger that fires on new user creation in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update RLS policy: remove the insert-only policy
drop policy if exists "User inserts own profile" on profiles;

-- Create a combined policy that allows users to manage (select, insert, update, delete) their own profile
-- The insert will mostly be handled by the trigger, but this allows manual updates
create policy "User manages own profile" on profiles 
  for all 
  using (auth.uid() = id)
  with check (auth.uid() = id);

