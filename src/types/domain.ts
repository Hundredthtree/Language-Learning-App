export type Role = "teacher" | "student";

export type Profile = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  role: Role;
};

export type Lesson = {
  id: string;
  student_id: string;
  teacher_id: string;
  started_at: string;
  title?: string | null;
  words?: LessonWord[];
  word_count?: number;
};

export type LessonWord = {
  id: string;
  lesson_id: string;
  term: string;
  translation?: string | null;
  note?: string | null;
  created_at?: string;
  lesson?: Lesson;
};

export type ReviewCard = {
  id: string;
  lesson_word_id: string;
  student_id: string;
  ease?: number | null;
  interval_days?: number | null;
  repetitions?: number | null;
  due_at?: string | null;
  total_success?: number | null;
  total_fail?: number | null;
  lesson_word?: LessonWord;
};

export type TeacherStudent = {
  teacher_id: string;
  student_id: string;
  created_at?: string;
  student?: Profile;
};
