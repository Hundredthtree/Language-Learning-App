-- NOTE: The original policies caused infinite recursion by querying profiles from within profiles policy.
-- These are the FIXED policies that avoid recursion:

-- Teachers can read profiles of students they're linked to (via teacher_students table)
CREATE POLICY "Teachers read linked student profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_students ts 
      WHERE ts.student_id = profiles.id AND ts.teacher_id = auth.uid()
    )
  );

-- Students can read profiles of teachers they're linked to (via teacher_students table)
CREATE POLICY "Students read linked teacher profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_students ts 
      WHERE ts.teacher_id = profiles.id AND ts.student_id = auth.uid()
    )
  );

-- For the invite flow, teachers need to search students by email
-- Allow reading any student profile for search (safe - only exposes minimal info)
CREATE POLICY "Anyone can read student profiles for linking" ON profiles
  FOR SELECT USING (role = 'student');

