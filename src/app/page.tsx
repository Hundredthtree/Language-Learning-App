"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { nextReview, type Grade } from "@/lib/spacedRepetition";
import type { Lesson, LessonWord, Profile, ReviewCard, Role } from "@/types/domain";

type AuthMode = "sign-in" | "sign-up";

const errorMessage =
  "Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, email, role")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Profile fetch failed", error);
      setStatus("Could not load profile. Check that the profiles table exists.");
    } else {
      setProfile(data as Profile);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });
    return () => {
      data?.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <span className="text-lg font-bold text-white">F</span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">
              Fluency Loop
            </span>
          </div>
          
          {session && profile && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  profile.role === 'teacher' 
                    ? 'bg-violet-500/20 text-violet-300' 
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {(profile.display_name || profile.email || '?')[0].toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-white">
                    {profile.display_name || profile.email}
                  </p>
                  <p className={`text-xs ${
                    profile.role === 'teacher' ? 'text-violet-400' : 'text-emerald-400'
                  }`}>
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/10"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Hero - only show when not logged in */}
        {!session && (
          <div className="mb-12 text-center">
            <h1 className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              Master every mistake
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
              Teachers capture tricky words in real-time. Students practice with 
              spaced repetition. Simple, focused, effective.
            </p>
          </div>
        )}

        {/* Error State */}
        {!supabase && (
          <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {/* Auth Panel */}
        {!session && (
          <AuthPanel
            mode={authMode}
            onModeChange={setAuthMode}
            onStatus={setStatus}
          />
        )}

        {/* Status Messages */}
        {status && (
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            {status}
          </div>
        )}

        {/* Dashboard */}
        {session && profile && !loading && (
          profile.role === "teacher" ? (
            <TeacherDashboard profile={profile} onStatus={setStatus} />
          ) : (
            <StudentDashboard profile={profile} onStatus={setStatus} />
          )
        )}

        {/* Loading State */}
        {loading && session && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        )}
      </main>
    </div>
  );
}

type AuthPanelProps = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onStatus: (message: string | null) => void;
};

function AuthPanel({ mode, onModeChange, onStatus }: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("teacher");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!supabase) return;
    setBusy(true);
    onStatus(null);
    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        onStatus(error.message);
      } else {
        onStatus("Signed in.");
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email,
            role,
          },
        },
      });
      if (error) {
        onStatus(error.message);
        setBusy(false);
        return;
      }
      if (data.user) {
        onStatus(
          "Account created! Check your email if confirmations are enabled.",
        );
      }
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
        {/* Tabs */}
        <div className="mb-6 flex rounded-lg bg-white/5 p-1">
          <button
            onClick={() => onModeChange("sign-in")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === "sign-in"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => onModeChange("sign-up")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === "sign-up"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create account
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              type="email"
              placeholder="you@example.com"
            />
          </div>
          
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              type="password"
              placeholder="••••••••"
            />
          </div>

          {mode === "sign-up" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Your name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  placeholder="Alex"
                />
              </div>
              
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  I am a...
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["teacher", "student"] as Role[]).map((value) => (
                    <button
                      key={value}
                      onClick={() => setRole(value)}
                      type="button"
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                        role === value
                          ? value === 'teacher'
                            ? "border-violet-500 bg-violet-500/10 text-violet-300"
                            : "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                          : "border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {value === "teacher" ? "👨‍🏫 Teacher" : "📚 Student"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </div>
    </div>
  );
}

type TeacherDashboardProps = {
  profile: Profile;
  onStatus: (message: string | null) => void;
};

function TeacherDashboard({ profile, onStatus }: TeacherDashboardProps) {
  const [students, setStudents] = useState<Profile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string>("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [linkEmail, setLinkEmail] = useState("");
  const [wordForm, setWordForm] = useState({
    term: "",
    translation: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);

  const activeLesson = useMemo(
    () => lessons.find((l) => l.id === activeLessonId),
    [lessons, activeLessonId],
  );

  const loadStudents = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("teacher_students")
      .select("student:student_id(id, display_name, email, role)")
      .eq("teacher_id", profile.id)
      .order("created_at", { ascending: false });
    if (error) {
      onStatus(`Could not load students: ${error.message}`);
    } else {
      type Row = { student: Profile | null };
      const mapped = ((data as Row[] | null) ?? [])
        .map((row) => row.student)
        .filter(Boolean) as Profile[];
      setStudents(mapped);
      if (!selectedStudent && mapped[0]) {
        setSelectedStudent(mapped[0].id);
      }
    }
  }, [onStatus, profile.id, selectedStudent]);

  const loadLessons = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("lessons")
      .select("id, student_id, teacher_id, started_at, title, lesson_words(count)")
      .eq("teacher_id", profile.id)
      .order("started_at", { ascending: false });
    if (error) {
      onStatus(`Could not load lessons: ${error.message}`);
    } else {
      type LessonRow = Lesson & { lesson_words?: { count: number }[] };
      const lessonRows = (data as LessonRow[] | null) ?? [];
      const mapped = lessonRows.map((row) => ({
        ...row,
        word_count: row.lesson_words?.[0]?.count ?? 0,
      }));
      setLessons(mapped);
      if (!activeLessonId && mapped[0]) {
        setActiveLessonId(mapped[0].id);
        setSelectedStudent(mapped[0].student_id);
      }
    }
  }, [activeLessonId, onStatus, profile.id]);

  useEffect(() => {
    void (async () => {
      await loadStudents();
      await loadLessons();
    })();
  }, [loadLessons, loadStudents]);

  const handleLinkStudent = async () => {
    if (!supabase) return;
    const email = linkEmail.trim().toLowerCase();
    if (!email) {
      onStatus("Enter a student email to link.");
      return;
    }
    setBusy(true);
    const { data: student, error: fetchError } = await supabase
      .from("profiles")
      .select("id, display_name, email, role")
      .eq("email", email)
      .eq("role", "student")
      .single();
    if (fetchError || !student) {
      onStatus(
        "Student not found. Ask them to sign up as a student first.",
      );
      setBusy(false);
      return;
    }

    const { error: linkError } = await supabase
      .from("teacher_students")
      .upsert({ teacher_id: profile.id, student_id: student.id });
    if (linkError) {
      onStatus(`Could not link student: ${linkError.message}`);
    } else {
      onStatus(`Linked ${student.display_name || student.email}!`);
      setLinkEmail("");
      await loadStudents();
    }
    setBusy(false);
  };

  const handleCreateLesson = async () => {
    if (!supabase) return;
    if (!selectedStudent) {
      onStatus("Select a student first.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("lessons")
      .insert({
        student_id: selectedStudent,
        teacher_id: profile.id,
        title: lessonTitle || `Lesson ${new Date().toLocaleDateString()}`,
      })
      .select()
      .single();
    if (error) {
      onStatus(`Could not create lesson: ${error.message}`);
    } else {
      setLessons([data as Lesson, ...lessons]);
      setActiveLessonId((data as Lesson).id);
      onStatus("Lesson started!");
      setLessonTitle("");
    }
    setBusy(false);
  };

  const handleAddWord = async () => {
    if (!supabase) return;
    if (!activeLesson) {
      onStatus("Start a lesson first.");
      return;
    }
    if (!wordForm.term.trim()) {
      onStatus("Enter a word or phrase.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("lesson_words")
      .insert({
        lesson_id: activeLesson.id,
        term: wordForm.term.trim(),
        translation: wordForm.translation.trim(),
        note: wordForm.note.trim(),
      })
      .select()
      .single();
    if (error) {
      onStatus(`Could not add word: ${error.message}`);
      setBusy(false);
      return;
    }

    await supabase.from("review_cards").insert({
      lesson_word_id: data.id,
      student_id: activeLesson.student_id,
      ease: 2.5,
      interval_days: 0,
      repetitions: 0,
      total_success: 0,
      total_fail: 0,
      due_at: new Date().toISOString(),
    });

    setWordForm({ term: "", translation: "", note: "" });
    onStatus("Word added!");
    loadLessons();
    setBusy(false);
  };

  const selectedStudentName = students.find(s => s.id === selectedStudent)?.display_name || 
                              students.find(s => s.id === selectedStudent)?.email || 
                              "Select student";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Teacher Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Capture mistakes during lessons, help students learn.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Link Student Card */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/20 text-xs">👤</span>
            Link Student
          </h3>
          <div className="flex gap-2">
            <input
              value={linkEmail}
              onChange={(e) => setLinkEmail(e.target.value)}
              placeholder="student@email.com"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500"
            />
            <button
              onClick={handleLinkStudent}
              disabled={busy}
              className="rounded-lg bg-violet-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-600 disabled:opacity-50"
            >
              Link
            </button>
          </div>
        </div>

        {/* Select Student Card */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-xs">📚</span>
            Active Student
          </h3>
          {students.length > 0 ? (
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id} className="bg-slate-900">
                  {student.display_name || student.email}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-slate-500">No students linked yet.</p>
          )}
        </div>

        {/* Start Lesson Card */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-fuchsia-500/20 text-xs">🎯</span>
            New Lesson
          </h3>
          <div className="flex gap-2">
            <input
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="Lesson title..."
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500"
            />
            <button
              onClick={handleCreateLesson}
              disabled={busy || !selectedStudent}
              className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Start
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lessons List */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Recent Lessons</h2>
            <button
              onClick={loadLessons}
              className="text-xs text-slate-400 transition hover:text-white"
            >
              Refresh
            </button>
          </div>
          
          {lessons.length > 0 ? (
            <div className="space-y-2">
              {lessons.slice(0, 5).map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setActiveLessonId(lesson.id);
                    setSelectedStudent(lesson.student_id);
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    activeLessonId === lesson.id
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-white/5 bg-white/[0.02] hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">
                      {lesson.title || "Untitled Lesson"}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                      {lesson.word_count ?? 0} words
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(lesson.started_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-white/10">
              <p className="text-sm text-slate-500">No lessons yet. Start one above!</p>
            </div>
          )}
        </div>

        {/* Add Word Form */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Add Mistake</h2>
            {activeLesson && (
              <span className="text-xs text-violet-400">
                → {activeLesson.title || "Current lesson"}
              </span>
            )}
          </div>
          
          <div className="space-y-3">
            <input
              value={wordForm.term}
              onChange={(e) => setWordForm((p) => ({ ...p, term: e.target.value }))}
              placeholder="Word or phrase (e.g., Считать vs. Читать)"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-violet-500"
            />
            <input
              value={wordForm.translation}
              onChange={(e) => setWordForm((p) => ({ ...p, translation: e.target.value }))}
              placeholder="Translation (e.g., to count vs. to read)"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-violet-500"
            />
            <textarea
              value={wordForm.note}
              onChange={(e) => setWordForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="Notes (e.g., Watch the first letter!)"
              rows={2}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-violet-500"
            />
            <button
              onClick={handleAddWord}
              disabled={busy || !activeLesson}
              className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:shadow-violet-500/30 disabled:opacity-50"
            >
              {activeLesson ? "Add to Lesson" : "Start a lesson first"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type StudentDashboardProps = {
  profile: Profile;
  onStatus: (message: string | null) => void;
};

function StudentDashboard({ profile, onStatus }: StudentDashboardProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [words, setWords] = useState<LessonWord[]>([]);
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const currentCard = cards[0];

  const loadLessons = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("lessons")
      .select("id, student_id, teacher_id, started_at, title, lesson_words(count)")
      .eq("student_id", profile.id)
      .order("started_at", { ascending: false });
    if (error) {
      onStatus(`Could not load lessons: ${error.message}`);
    } else {
      type LessonRow = Lesson & { lesson_words?: { count: number }[] };
      const lessonRows = (data as LessonRow[] | null) ?? [];
      const mapped = lessonRows.map((row) => ({
        ...row,
        word_count: row.lesson_words?.[0]?.count ?? 0,
      }));
      setLessons(mapped);
      if (!selectedLessonId && mapped[0]) {
        setSelectedLessonId(mapped[0].id);
      }
    }
  }, [onStatus, profile.id, selectedLessonId]);

  const loadWords = useCallback(
    async (lessonId: string) => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("lesson_words")
        .select("id, lesson_id, term, translation, note, created_at")
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: false });
      if (error) {
        onStatus(`Could not load words: ${error.message}`);
      } else {
        setWords((data ?? []) as LessonWord[]);
      }
    },
    [onStatus],
  );

  const loadDueCards = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("review_cards")
      .select(
        "id, ease, interval_days, repetitions, due_at, total_success, total_fail, lesson_word:lesson_word_id(id, term, translation, note, lesson:lesson_id(id, title))",
      )
      .eq("student_id", profile.id)
      .order("due_at", { ascending: true })
      .limit(50);
    if (error) {
      onStatus(`Could not load review cards: ${error.message}`);
    } else {
      setCards((data ?? []) as ReviewCard[]);
    }
  }, [onStatus, profile.id]);

  useEffect(() => {
    void (async () => {
      await loadLessons();
      await loadDueCards();
    })();
  }, [loadDueCards, loadLessons]);

  useEffect(() => {
    if (selectedLessonId) {
      void loadWords(selectedLessonId);
    }
  }, [loadWords, selectedLessonId]);

  const reviewCard = async (grade: Grade) => {
    if (!supabase || !currentCard) return;
    setBusy(true);
    const next = nextReview(currentCard, grade);
    const { error } = await supabase
      .from("review_cards")
      .update({
        ease: next.ease,
        interval_days: next.intervalDays,
        repetitions: next.repetitions,
        due_at: next.dueAt,
        total_success: next.totalSuccess,
        total_fail: next.totalFail,
      })
      .eq("id", currentCard.id);
    if (error) {
      onStatus(`Could not update card: ${error.message}`);
    } else {
      setCards((prev) => prev.slice(1));
      setShowAnswer(false);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Study Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Review your cards and track your progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-300">
            {cards.length} cards due
          </span>
          <button
            onClick={loadDueCards}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr,1.5fr]">
        {/* Lessons & Words */}
        <div className="space-y-4">
          {/* Lessons */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Your Lessons</h2>
            {lessons.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      selectedLessonId === lesson.id
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {lesson.title || "Lesson"} ({lesson.word_count ?? 0})
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No lessons yet. Ask your teacher to create one!
              </p>
            )}
          </div>

          {/* Words List */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">
              Words from lesson
            </h2>
            {words.length > 0 ? (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {words.map((word) => (
                  <div
                    key={word.id}
                    className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="font-medium text-white">{word.term}</div>
                    {word.translation && (
                      <div className="text-sm text-slate-400">{word.translation}</div>
                    )}
                    {word.note && (
                      <div className="mt-1 text-xs text-slate-500">{word.note}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {selectedLessonId ? "No words in this lesson yet." : "Select a lesson to see words."}
              </p>
            )}
          </div>
        </div>

        {/* Flashcard Review */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-6">
          <h2 className="mb-4 text-sm font-semibold text-white">Flashcard Review</h2>
          
          {currentCard ? (
            <div className="space-y-4">
              {/* Card */}
              <div 
                onClick={() => setShowAnswer(true)}
                className="flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center transition hover:border-white/20"
              >
                <p className="text-xs text-slate-500 mb-2">
                  {currentCard.lesson_word?.lesson?.title || "Lesson"}
                </p>
                <p className="text-2xl font-bold text-white">
                  {currentCard.lesson_word?.term}
                </p>
                
                {showAnswer ? (
                  <>
                    {currentCard.lesson_word?.translation && (
                      <p className="mt-4 text-lg text-emerald-300">
                        {currentCard.lesson_word.translation}
                      </p>
                    )}
                    {currentCard.lesson_word?.note && (
                      <p className="mt-2 text-sm text-slate-400">
                        {currentCard.lesson_word.note}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    Tap to reveal answer
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex justify-center gap-4 text-xs text-slate-500">
                <span>Interval: {currentCard.interval_days ?? 0}d</span>
                <span>•</span>
                <span>Ease: {(currentCard.ease ?? 2.5).toFixed(1)}</span>
                <span>•</span>
                <span>Reps: {currentCard.repetitions ?? 0}</span>
              </div>

              {/* Action Buttons */}
              {showAnswer && (
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => reviewCard("again")}
                    disabled={busy}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Again
                  </button>
                  <button
                    onClick={() => reviewCard("hard")}
                    disabled={busy}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 py-3 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    Hard
                  </button>
                  <button
                    onClick={() => reviewCard("good")}
                    disabled={busy}
                    className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-emerald-500/30 disabled:opacity-50"
                  >
                    Got it!
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-medium text-white">All caught up!</p>
              <p className="mt-1 text-sm text-slate-500">
                No cards due right now. Check back later!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
