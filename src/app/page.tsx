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
    <div className="min-h-screen text-slate-100">
      <div className="relative z-0 mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14 lg:py-20">
        <div className="absolute inset-0 -z-10 blur-3xl">
          <div className="from-indigo-500/20 via-purple-400/10 to-transparent absolute left-[-15%] top-[-20%] h-72 w-72 rounded-full bg-gradient-to-br" />
          <div className="from-cyan-400/20 via-blue-300/10 to-transparent absolute right-[-10%] top-[10%] h-72 w-72 rounded-full bg-gradient-to-br" />
        </div>

        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                Fluency Loop
              </p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Capture mistakes in class, master them after.
              </h1>
            </div>
            {session && profile && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {profile.display_name || profile.email}
                  </p>
                  <p className={`text-xs font-medium uppercase tracking-wider ${
                    profile.role === 'teacher' ? 'text-indigo-400' : 'text-cyan-400'
                  }`}>
                    {profile.role}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
          <p className="max-w-2xl text-lg text-slate-300">
            Teachers log tricky words live during the lesson. Students revisit
            every mistake with a swipe-first spaced repetition trainer.
          </p>
        </header>

        {!supabase && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
            {errorMessage}
          </div>
        )}

        {!session && (
          <AuthPanel
            mode={authMode}
            onModeChange={setAuthMode}
            onStatus={setStatus}
          />
        )}

        {status && (
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/50 px-4 py-3 text-sm text-slate-200">
            {status}
          </div>
        )}

        {session && profile && !loading && (
          <div className="grid gap-8 lg:grid-cols-[2fr,1.1fr]">
            {profile.role === "teacher" ? (
              <TeacherDashboard profile={profile} onStatus={setStatus} />
            ) : (
              <StudentDashboard profile={profile} onStatus={setStatus} />
            )}
            <GuidePanel role={profile.role} />
          </div>
        )}
      </div>
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
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-900/60 p-6 shadow-xl shadow-black/20 backdrop-blur-md">
      <div className="mb-6 flex items-center justify-center gap-2">
        <button
          onClick={() => onModeChange("sign-in")}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            mode === "sign-in"
              ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
              : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          Sign in
        </button>
        <button
          onClick={() => onModeChange("sign-up")}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            mode === "sign-up"
              ? "bg-slate-200 text-slate-900 shadow-md shadow-slate-200/20"
              : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          Create account
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-400">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-slate-50 outline-none transition focus:border-indigo-400"
            type="email"
            placeholder="you@example.com"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-400">Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-slate-50 outline-none transition focus:border-indigo-400"
            type="password"
            placeholder="••••••••"
          />
        </label>
        {mode === "sign-up" && (
          <>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-slate-400">Display name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-slate-50 outline-none transition focus:border-indigo-400"
                placeholder="Your name"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-slate-400">I am a...</span>
              <div className="flex gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-2">
                {(["teacher", "student"] as Role[]).map((value) => (
                  <button
                    key={value}
                    onClick={() => setRole(value)}
                    className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      role === value
                        ? "bg-indigo-500 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                    type="button"
                  >
                    {value === "teacher" ? "Teacher" : "Student"}
                  </button>
                ))}
              </div>
            </label>
          </>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={busy}
        className="mt-6 w-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>

      <p className="mt-4 text-center text-xs text-slate-500">
        {mode === "sign-in" 
          ? "Don't have an account? Click 'Create account' above."
          : "Already have an account? Click 'Sign in' above."}
      </p>
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
        "Student not found. Ask them to sign up as a student, then link again.",
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
      onStatus("Student linked. They will now show up in the list.");
      setLinkEmail("");
      await loadStudents();
    }
    setBusy(false);
  };

  const handleCreateLesson = async () => {
    if (!supabase) return;
    if (!selectedStudent) {
      onStatus("Pick a student before starting a lesson.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("lessons")
      .insert({
        student_id: selectedStudent,
        teacher_id: profile.id,
        title: lessonTitle || "Lesson",
      })
      .select()
      .single();
    if (error) {
      onStatus(`Could not create lesson: ${error.message}`);
    } else {
      setLessons([data as Lesson, ...lessons]);
      setActiveLessonId((data as Lesson).id);
      onStatus("Lesson created. Start adding words.");
      setLessonTitle("");
    }
    setBusy(false);
  };

  const handleAddWord = async () => {
    if (!supabase) return;
    if (!activeLesson) {
      onStatus("Start or select a lesson first.");
      return;
    }
    if (!wordForm.term.trim()) {
      onStatus("Type a word or phrase to add.");
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
    onStatus("Word added. It is ready for the student to review.");
    loadLessons();
    setBusy(false);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-700/70 bg-slate-950/60 p-6 shadow-xl shadow-black/30 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-300/80">
            Teacher view
          </p>
          <h2 className="text-2xl font-semibold text-white">Live lesson desk</h2>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr] lg:items-end">
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Your students</h3>
            <span className="text-[11px] uppercase tracking-[0.15em] text-slate-500">
              Link by email
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={linkEmail}
              onChange={(e) => setLinkEmail(e.target.value)}
              placeholder="student@email.com"
              className="flex-1 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-indigo-400"
            />
            <button
              onClick={handleLinkStudent}
              disabled={busy}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:brightness-105 disabled:opacity-60"
            >
              Link
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Student must sign up with role = student. Linking prevents showing
            unrelated students.
          </p>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-400">Select student</span>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-50 outline-none transition focus:border-indigo-400"
              disabled={!students.length}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.display_name || student.email || "Unnamed"}
                </option>
              ))}
            </select>
            {!students.length && (
              <span className="text-xs text-amber-300">
                Link a student to start lessons.
              </span>
            )}
          </label>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-400">Lesson label</span>
          <input
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            placeholder="Lesson on cases, Nov 5"
            className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-50 outline-none transition focus:border-indigo-400"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleCreateLesson}
          disabled={busy || !selectedStudent}
          className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:brightness-110 disabled:opacity-60"
        >
          Start lesson
        </button>
        <button
          onClick={loadLessons}
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-400 hover:text-white"
        >
          Refresh lessons
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Active lesson</h3>
            <span className="text-xs text-slate-400">
              {activeLesson
                ? new Date(activeLesson.started_at).toLocaleString()
                : "No lesson yet"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => {
                  setActiveLessonId(lesson.id);
                  setSelectedStudent(lesson.student_id);
                }}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  activeLessonId === lesson.id
                    ? "border-indigo-400 bg-indigo-500/10 text-white"
                    : "border-slate-700/70 bg-slate-900/60 text-slate-200 hover:border-indigo-300/60"
                }`}
              >
                <div className="font-semibold">
                  {lesson.title || "Lesson"}
                </div>
                <div className="text-xs text-slate-400">
                  {lesson.word_count ?? 0} words
                </div>
              </button>
            ))}
            {lessons.length === 0 && (
              <div className="text-sm text-slate-400">
                Start a lesson to begin logging mistakes.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Add mistakes</h3>
            <span className="text-xs text-slate-400">Instantly saved</span>
          </div>
          <div className="grid gap-3">
            <input
              value={wordForm.term}
              onChange={(e) =>
                setWordForm((prev) => ({ ...prev, term: e.target.value }))
              }
              placeholder="Считать vs. Читать"
              className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-indigo-400"
            />
            <input
              value={wordForm.translation}
              onChange={(e) =>
                setWordForm((prev) => ({
                  ...prev,
                  translation: e.target.value,
                }))
              }
              placeholder="to count vs. to read"
              className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-indigo-400"
            />
            <textarea
              value={wordForm.note}
              onChange={(e) =>
                setWordForm((prev) => ({ ...prev, note: e.target.value }))
              }
              placeholder="Used accusative here, but you used genitive."
              className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-indigo-400"
              rows={3}
            />
            <button
              onClick={handleAddWord}
              disabled={busy}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110 disabled:opacity-60"
            >
              Add to lesson
            </button>
          </div>
        </section>
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    }
    setBusy(false);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-700/70 bg-slate-950/60 p-6 shadow-xl shadow-black/30 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
            Student view
          </p>
          <h2 className="text-2xl font-semibold text-white">
            Study deck & lesson log
          </h2>
        </div>
        <button
          onClick={loadDueCards}
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-white"
        >
          Refresh due cards
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <section className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Lessons & words
              </h3>
              <p className="text-xs text-slate-400">
                Pick a lesson to browse your mistakes.
              </p>
            </div>
            <button
              onClick={loadLessons}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:border-cyan-300 hover:text-white"
            >
              Sync
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => setSelectedLessonId(lesson.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selectedLessonId === lesson.id
                    ? "border-cyan-300 bg-cyan-500/10 text-white"
                    : "border-slate-700/70 bg-slate-900/60 text-slate-200 hover:border-cyan-300/60"
                }`}
              >
                <div className="font-semibold">
                  {lesson.title || "Lesson"}
                </div>
                <div className="text-xs text-slate-400">
                  {lesson.word_count ?? 0} words
                </div>
              </button>
            ))}
            {lessons.length === 0 && (
              <div className="text-sm text-slate-400">
                No lessons yet. Once your teacher logs mistakes, they will
                appear here.
              </div>
            )}
          </div>
          <div className="mt-4 grid gap-3">
            {words.map((word) => (
              <div
                key={word.id}
                className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-white">
                    {word.term}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(word.created_at ?? "").toLocaleDateString()}
                  </div>
                </div>
                {word.translation && (
                  <div className="text-sm text-slate-200">
                    {word.translation}
                  </div>
                )}
                {word.note && (
                  <div className="mt-1 text-sm text-slate-400">{word.note}</div>
                )}
              </div>
            ))}
            {selectedLessonId && words.length === 0 && (
              <div className="text-sm text-slate-400">
                Lesson selected, waiting on teacher to add mistakes.
              </div>
            )}
          </div>
        </section>

        <section className="relative flex h-full flex-col gap-4 rounded-xl border border-slate-800/80 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-slate-800/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Swipe trainer
              </h3>
              <p className="text-xs text-slate-400">
                Left = Again, Right = Got it. Cards follow spaced repetition.
              </p>
            </div>
            <div className="rounded-full bg-slate-800/60 px-3 py-1 text-xs text-slate-200">
              {cards.length} due
            </div>
          </div>

          <div className="relative h-80 w-full">
            {currentCard ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full max-w-md rotate-[-1deg] rounded-2xl border border-slate-700/80 bg-slate-900/90 p-6 text-left shadow-2xl shadow-black/40">
                  <div className="text-sm uppercase tracking-[0.2em] text-cyan-200/80">
                    {currentCard.lesson_word?.lesson?.title || "Lesson"}
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    {currentCard.lesson_word?.term}
                  </div>
                  {currentCard.lesson_word?.translation && (
                    <div className="mt-2 text-xl text-slate-200">
                      {currentCard.lesson_word.translation}
                    </div>
                  )}
                  {currentCard.lesson_word?.note && (
                    <div className="mt-3 text-sm text-slate-400">
                      {currentCard.lesson_word.note}
                    </div>
                  )}
                  <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
                    <span>Interval: {currentCard.interval_days ?? 0}d</span>
                    <span>Ease: {(currentCard.ease ?? 2.5).toFixed(2)}</span>
                    <span>Reps: {currentCard.repetitions ?? 0}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-700/70 text-slate-400">
                No cards due. Refresh or ask your teacher to add more mistakes.
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => reviewCard("again")}
              disabled={busy || !currentCard}
              className="flex-1 rounded-full border border-rose-400/80 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/10 disabled:opacity-60"
            >
              Again
            </button>
            <button
              onClick={() => reviewCard("hard")}
              disabled={busy || !currentCard}
              className="flex-1 rounded-full border border-amber-300/70 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/10 disabled:opacity-60"
            >
              Hard
            </button>
            <button
              onClick={() => reviewCard("good")}
              disabled={busy || !currentCard}
              className="flex-1 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:brightness-110 disabled:opacity-60"
            >
              Got it
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

type GuidePanelProps = { role: Role };

function GuidePanel({ role }: GuidePanelProps) {
  return (
    <aside className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-5 shadow-lg shadow-black/20 backdrop-blur">
      <h3 className="text-lg font-semibold text-white">How it works</h3>
      <ul className="mt-3 space-y-3 text-sm text-slate-300">
        {role === "teacher" ? (
          <>
            <li>
              • Create an account as a teacher. Students sign up separately as
              students.
            </li>
            <li>• Link a student by email, pick them, start a lesson, and add words live.</li>
            <li>
              • Each word also creates a review card with default spaced
              repetition values.
            </li>
            <li>
              • Students instantly see lessons and can practice from their deck.
            </li>
          </>
        ) : (
          <>
            <li>• Sign in as a student to see lessons your teacher starts.</li>
            <li>• Your teacher links you by email; then lessons show up.</li>
            <li>
              • Each logged mistake appears as a swipe card in the trainer.
            </li>
            <li>
              • Again / Hard / Got it update the next review time using a light
              SM2-style curve.
            </li>
            <li>
              • Refresh due cards to pull the latest words after every lesson.
            </li>
          </>
        )}
        <li className="text-xs text-slate-400">
          Add the Supabase tables from README, set env vars, and you are ready
          to ship.
        </li>
      </ul>
    </aside>
  );
}
