"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { nextReview, type Grade } from "@/lib/spacedRepetition";
import type { Lesson, LessonWord, Profile, ReviewCard, Role } from "@/types/domain";

type AuthMode = "sign-in" | "sign-up";

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email, role, avatar_url")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Profile fetch failed:", error.message, error.code, error.details);
        setToast(`Could not load profile: ${error.message}`);
      } else {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error("Profile fetch exception:", err);
      setToast("Failed to load profile. Please try again.");
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

  const updateProfile = (updated: Profile) => {
    setProfile(updated);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <span className="text-lg font-bold text-white">F</span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">
              Fluency Loop
            </span>
          </div>
          {session && (
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/10"
            >
              Sign out
            </button>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Not configured */}
        {!supabase && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
            Supabase not configured. Set environment variables.
          </div>
        )}

        {/* Auth */}
        {!session && (
          <>
            <div className="mb-12 text-center">
              <h1 className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
                Master every mistake
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
                Teachers capture tricky words in real-time. Students practice with 
                spaced repetition.
              </p>
            </div>
            <AuthPanel mode={authMode} onModeChange={setAuthMode} onToast={setToast} />
          </>
        )}

        {/* Loading */}
        {loading && session && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        )}

        {/* Error state - session exists but profile failed to load */}
        {session && !profile && !loading && (
          <div className="mx-auto max-w-md text-center py-12">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
              <h2 className="text-lg font-semibold text-white mb-2">Profile Error</h2>
              <p className="text-sm text-slate-400 mb-4">
                Could not load your profile. This may be a temporary issue.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => session?.user && loadProfile(session.user.id)}
                  className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
                >
                  Retry
                </button>
                <button
                  onClick={handleSignOut}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {session && profile && !loading && (
          profile.role === "teacher" ? (
            <TeacherDashboard profile={profile} onToast={setToast} onUpdateProfile={updateProfile} />
          ) : (
            <StudentDashboard profile={profile} onToast={setToast} onUpdateProfile={updateProfile} />
          )
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/95 px-4 py-3 text-sm text-slate-200 shadow-xl backdrop-blur-sm">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="text-slate-500 hover:text-white">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// AUTH PANEL
// ============================================

type AuthPanelProps = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onToast: (msg: string) => void;
};

function AuthPanel({ mode, onModeChange, onToast }: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("teacher");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!supabase) return;
    setBusy(true);
    
    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) onToast(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName || email, role } },
      });
      if (error) {
        onToast(error.message);
      } else if (data.user) {
        onToast("Account created! Check email if confirmation is enabled.");
      }
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-6 flex rounded-lg bg-white/5 p-1">
          <button
            onClick={() => onModeChange("sign-in")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === "sign-in" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => onModeChange("sign-up")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === "sign-up" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Create account
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-violet-500"
              type="email"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-violet-500"
              type="password"
              placeholder="••••••••"
            />
          </div>
          {mode === "sign-up" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Your name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-violet-500"
                  placeholder="Alex"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">I am a...</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["teacher", "student"] as Role[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setRole(v)}
                      type="button"
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                        role === v
                          ? v === "teacher"
                            ? "border-violet-500 bg-violet-500/10 text-violet-300"
                            : "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                          : "border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {v === "teacher" ? "👨‍🏫 Teacher" : "📚 Student"}
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
          className="mt-6 w-full rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-violet-500/40 disabled:opacity-50"
        >
          {busy ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </div>
    </div>
  );
}

// ============================================
// AVATAR WIDGET (Inline with headers)
// ============================================

type AvatarWidgetProps = {
  profile: Profile;
  onToast: (msg: string) => void;
  onUpdateProfile: (profile: Profile) => void;
};

function AvatarWidget({ profile, onToast, onUpdateProfile }: AvatarWidgetProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!supabase || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${profile.id}/${Date.now()}.${fileExt}`;

    setUploading(true);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      onToast(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profile.id);

    if (updateError) {
      onToast(`Could not update profile: ${updateError.message}`);
    } else {
      onToast('Avatar updated!');
      onUpdateProfile({ ...profile, avatar_url: publicUrl });
    }
    setUploading(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 transition hover:bg-white/[0.05]"
      >
        {/* Avatar */}
        <div className="relative">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className={`h-9 w-9 rounded-full object-cover ${uploading ? 'opacity-50' : ''}`}
            />
          ) : (
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
              profile.role === 'teacher' 
                ? 'bg-violet-500/20 text-violet-300' 
                : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {(profile.display_name || profile.email || '?')[0].toUpperCase()}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium text-white">
            {profile.display_name || profile.email}
          </p>
          <p className={`text-xs ${
            profile.role === 'teacher' ? 'text-violet-400' : 'text-emerald-400'
          }`}>
            {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
          </p>
        </div>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-white/10 bg-slate-900 p-2 shadow-xl">
            <button
              onClick={() => { handleAvatarClick(); setShowMenu(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Change avatar
            </button>
          </div>
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

// ============================================
// TEACHER DASHBOARD
// ============================================

type TeacherView = "students" | "lessons" | "lesson-detail";

type TeacherDashboardProps = {
  profile: Profile;
  onToast: (msg: string) => void;
  onUpdateProfile: (profile: Profile) => void;
};

function TeacherDashboard({ profile, onToast, onUpdateProfile }: TeacherDashboardProps) {
  const [view, setView] = useState<TeacherView>("students");
  const [students, setStudents] = useState<Profile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [lessons, setLessons] = useState<(Lesson & { word_count?: number })[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonWords, setLessonWords] = useState<LessonWord[]>([]);
  const [linkEmail, setLinkEmail] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [wordForm, setWordForm] = useState({ term: "", translation: "", note: "" });
  const [busy, setBusy] = useState(false);

  // Load students
  const loadStudents = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("teacher_students")
      .select("student:student_id(id, display_name, email, role)")
      .eq("teacher_id", profile.id)
      .order("created_at", { ascending: false });
    if (error) {
      onToast(`Could not load students: ${error.message}`);
    } else {
      type Row = { student: Profile | null };
      const mapped = ((data as Row[]) ?? []).map((r) => r.student).filter(Boolean) as Profile[];
      setStudents(mapped);
    }
  }, [onToast, profile.id]);

  // Load lessons for selected student
  const loadLessons = useCallback(async () => {
    if (!supabase || !selectedStudent) return;
    const { data, error } = await supabase
      .from("lessons")
      .select("id, student_id, teacher_id, started_at, title, lesson_words(count)")
      .eq("teacher_id", profile.id)
      .eq("student_id", selectedStudent.id)
      .order("started_at", { ascending: false });
    if (error) {
      onToast(`Could not load lessons: ${error.message}`);
    } else {
      type LessonRow = Lesson & { lesson_words?: { count: number }[] };
      const mapped = ((data as LessonRow[]) ?? []).map((r) => ({
        ...r,
        word_count: r.lesson_words?.[0]?.count ?? 0,
      }));
      setLessons(mapped);
    }
  }, [onToast, profile.id, selectedStudent]);

  // Load words for selected lesson
  const loadLessonWords = useCallback(async () => {
    if (!supabase || !selectedLesson) return;
    const { data, error } = await supabase
      .from("lesson_words")
      .select("*")
      .eq("lesson_id", selectedLesson.id)
      .order("created_at", { ascending: false });
    if (error) {
      onToast(`Could not load words: ${error.message}`);
    } else {
      setLessonWords((data ?? []) as LessonWord[]);
    }
  }, [onToast, selectedLesson]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    if (selectedStudent && view === "lessons") {
      loadLessons();
    }
  }, [selectedStudent, view, loadLessons]);

  useEffect(() => {
    if (selectedLesson && view === "lesson-detail") {
      loadLessonWords();
    }
  }, [selectedLesson, view, loadLessonWords]);

  // Link student
  const handleLinkStudent = async () => {
    if (!supabase) return;
    const email = linkEmail.trim().toLowerCase();
    if (!email) {
      onToast("Enter a student email.");
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
      onToast("Student not found. They must sign up as a student first.");
      setBusy(false);
      return;
    }
    const { error: linkError } = await supabase
      .from("teacher_students")
      .upsert({ teacher_id: profile.id, student_id: student.id });
    if (linkError) {
      onToast(`Could not link: ${linkError.message}`);
    } else {
      onToast(`Linked ${student.display_name || student.email}!`);
      setLinkEmail("");
      await loadStudents();
    }
    setBusy(false);
  };

  // Select student and go to lessons view
  const handleSelectStudent = (student: Profile) => {
    setSelectedStudent(student);
    setSelectedLesson(null);
    setView("lessons");
  };

  // Create lesson
  const handleCreateLesson = async () => {
    if (!supabase || !selectedStudent) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("lessons")
      .insert({
        student_id: selectedStudent.id,
        teacher_id: profile.id,
        title: lessonTitle || `Lesson ${new Date().toLocaleDateString()}`,
      })
      .select()
      .single();
    if (error) {
      onToast(`Could not create lesson: ${error.message}`);
    } else {
      onToast("Lesson created!");
      setLessonTitle("");
      setSelectedLesson(data as Lesson);
      setView("lesson-detail");
      await loadLessons();
    }
    setBusy(false);
  };

  // Select lesson
  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setView("lesson-detail");
  };

  // Add word
  const handleAddWord = async () => {
    if (!supabase || !selectedLesson || !selectedStudent) return;
    if (!wordForm.term.trim()) {
      onToast("Enter a word or phrase.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("lesson_words")
      .insert({
        lesson_id: selectedLesson.id,
        term: wordForm.term.trim(),
        translation: wordForm.translation.trim(),
        note: wordForm.note.trim(),
      })
      .select()
      .single();
    if (error) {
      onToast(`Could not add: ${error.message}`);
      setBusy(false);
      return;
    }
    // Create review card for student
    await supabase.from("review_cards").insert({
      lesson_word_id: data.id,
      student_id: selectedStudent.id,
      ease: 2.5,
      interval_days: 0,
      repetitions: 0,
      total_success: 0,
      total_fail: 0,
      due_at: new Date().toISOString(),
    });
    setWordForm({ term: "", translation: "", note: "" });
    onToast("Word added!");
    await loadLessonWords();
    await loadLessons();
    setBusy(false);
  };

  // Navigation breadcrumb
  const Breadcrumb = () => (
    <div className="mb-6 flex items-center gap-2 text-sm">
      <button
        onClick={() => { setView("students"); setSelectedStudent(null); setSelectedLesson(null); }}
        className={`transition ${view === "students" ? "text-white font-medium" : "text-slate-400 hover:text-white"}`}
      >
        Students
      </button>
      {selectedStudent && (
        <>
          <span className="text-slate-600">/</span>
          <button
            onClick={() => { setView("lessons"); setSelectedLesson(null); }}
            className={`transition ${view === "lessons" ? "text-white font-medium" : "text-slate-400 hover:text-white"}`}
          >
            {selectedStudent.display_name || selectedStudent.email}
          </button>
        </>
      )}
      {selectedLesson && (
        <>
          <span className="text-slate-600">/</span>
          <span className="text-white font-medium">{selectedLesson.title || "Lesson"}</span>
        </>
      )}
    </div>
  );

  return (
    <div>
      <Breadcrumb />

      {/* STUDENTS VIEW */}
      {view === "students" && (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Your Students</h1>
              <p className="mt-1 text-sm text-slate-400">Invite students or select one to manage their lessons.</p>
            </div>
            <AvatarWidget profile={profile} onToast={onToast} onUpdateProfile={onUpdateProfile} />
          </div>

          {/* Invite Card */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-3 text-sm font-semibold text-white">Invite a Student</h2>
            <p className="mb-4 text-xs text-slate-500">The student must have created an account first.</p>
            <div className="flex gap-2">
              <input
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                placeholder="student@email.com"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-violet-500"
                onKeyDown={(e) => e.key === "Enter" && handleLinkStudent()}
              />
              <button
                onClick={handleLinkStudent}
                disabled={busy}
                className="rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-600 disabled:opacity-50"
              >
                Invite
              </button>
            </div>
          </div>

          {/* Students List */}
          {students.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => handleSelectStudent(student)}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-violet-500/50 hover:bg-violet-500/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                    {(student.display_name || student.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{student.display_name || "Unnamed"}</p>
                    <p className="text-xs text-slate-500 truncate">{student.email}</p>
                  </div>
                  <span className="text-slate-600">→</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 text-slate-500">
              No students yet. Invite one above!
            </div>
          )}
        </div>
      )}

      {/* LESSONS VIEW */}
      {view === "lessons" && selectedStudent && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Lessons with {selectedStudent.display_name || selectedStudent.email}
              </h1>
              <p className="mt-1 text-sm text-slate-400">Create a new lesson or continue an existing one.</p>
            </div>
          </div>

          {/* New Lesson */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-3 text-sm font-semibold text-white">Start New Lesson</h2>
            <div className="flex gap-2">
              <input
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Lesson title (optional)"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-violet-500"
                onKeyDown={(e) => e.key === "Enter" && handleCreateLesson()}
              />
              <button
                onClick={handleCreateLesson}
                disabled={busy}
                className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                Start Lesson
              </button>
            </div>
          </div>

          {/* Lessons List */}
          {lessons.length > 0 ? (
            <div className="space-y-2">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => handleSelectLesson(lesson)}
                  className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-violet-500/50 hover:bg-violet-500/5"
                >
                  <div>
                    <p className="font-medium text-white">{lesson.title || "Untitled Lesson"}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(lesson.started_at).toLocaleDateString()} • {lesson.word_count ?? 0} words
                    </p>
                  </div>
                  <span className="text-slate-600">→</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 text-slate-500">
              No lessons yet. Start one above!
            </div>
          )}
        </div>
      )}

      {/* LESSON DETAIL VIEW */}
      {view === "lesson-detail" && selectedLesson && selectedStudent && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{selectedLesson.title || "Lesson"}</h1>
            <p className="mt-1 text-sm text-slate-400">
              With {selectedStudent.display_name || selectedStudent.email} • {new Date(selectedLesson.started_at).toLocaleDateString()}
            </p>
          </div>

          {/* Add Word Form */}
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">Add Mistake</h2>
            <div className="space-y-3">
              <input
                value={wordForm.term}
                onChange={(e) => setWordForm((p) => ({ ...p, term: e.target.value }))}
                placeholder="Word or phrase they got wrong"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-violet-500"
              />
              <input
                value={wordForm.translation}
                onChange={(e) => setWordForm((p) => ({ ...p, translation: e.target.value }))}
                placeholder="Correct meaning / translation"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-violet-500"
              />
              <textarea
                value={wordForm.note}
                onChange={(e) => setWordForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="Notes or explanation (optional)"
                rows={2}
                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-violet-500"
              />
              <button
                onClick={handleAddWord}
                disabled={busy}
                className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:shadow-violet-500/30 disabled:opacity-50"
              >
                Add to Lesson
              </button>
            </div>
          </div>

          {/* Words in this lesson */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-white">
              Words in this lesson ({lessonWords.length})
            </h2>
            {lessonWords.length > 0 ? (
              <div className="space-y-2">
                {lessonWords.map((word) => (
                  <div
                    key={word.id}
                    className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-white">{word.term}</p>
                        {word.translation && <p className="text-sm text-slate-400">{word.translation}</p>}
                        {word.note && <p className="mt-1 text-xs text-slate-500">{word.note}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-white/10 text-slate-500">
                No words added yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// STUDENT DASHBOARD
// ============================================

type StudentView = "overview" | "practice-lesson" | "practice-all";

type StudentDashboardProps = {
  profile: Profile;
  onToast: (msg: string) => void;
  onUpdateProfile: (profile: Profile) => void;
};

function StudentDashboard({ profile, onToast, onUpdateProfile }: StudentDashboardProps) {
  const [view, setView] = useState<StudentView>("overview");
  const [lessons, setLessons] = useState<(Lesson & { word_count?: number })[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [totalDue, setTotalDue] = useState(0);

  const currentCard = cards[0];

  // Load lessons
  const loadLessons = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("lessons")
      .select("id, student_id, teacher_id, started_at, title, lesson_words(count)")
      .eq("student_id", profile.id)
      .order("started_at", { ascending: false });
    if (error) {
      onToast(`Could not load lessons: ${error.message}`);
    } else {
      type LessonRow = Lesson & { lesson_words?: { count: number }[] };
      const mapped = ((data as LessonRow[]) ?? []).map((r) => ({
        ...r,
        word_count: r.lesson_words?.[0]?.count ?? 0,
      }));
      setLessons(mapped);
    }
  }, [onToast, profile.id]);

  // Load all due cards count
  const loadTotalDue = useCallback(async () => {
    if (!supabase) return;
    const { count } = await supabase
      .from("review_cards")
      .select("*", { count: "exact", head: true })
      .eq("student_id", profile.id)
      .lte("due_at", new Date().toISOString());
    setTotalDue(count ?? 0);
  }, [profile.id]);

  // Load cards for practice (all or specific lesson)
  const loadCards = useCallback(async (lessonId?: string) => {
    if (!supabase) return;
    let query = supabase
      .from("review_cards")
      .select("id, ease, interval_days, repetitions, due_at, total_success, total_fail, lesson_word:lesson_word_id(id, term, translation, note, lesson:lesson_id(id, title))")
      .eq("student_id", profile.id)
      .order("due_at", { ascending: true });

    if (lessonId) {
      // Filter by lesson - need to join through lesson_words
      const { data: wordIds } = await supabase
        .from("lesson_words")
        .select("id")
        .eq("lesson_id", lessonId);
      
      if (wordIds && wordIds.length > 0) {
        query = query.in("lesson_word_id", wordIds.map((w) => w.id));
      }
    }

    const { data, error } = await query.limit(100);
    if (error) {
      onToast(`Could not load cards: ${error.message}`);
    } else {
      setCards((data ?? []) as ReviewCard[]);
    }
  }, [onToast, profile.id]);

  useEffect(() => {
    loadLessons();
    loadTotalDue();
  }, [loadLessons, loadTotalDue]);

  // Start practicing a specific lesson
  const handlePracticeLesson = async (lesson: Lesson) => {
    setSelectedLesson(lesson);
    await loadCards(lesson.id);
    setView("practice-lesson");
    setShowAnswer(false);
  };

  // Start practicing all words
  const handlePracticeAll = async () => {
    setSelectedLesson(null);
    await loadCards();
    setView("practice-all");
    setShowAnswer(false);
  };

  // Review a card
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
      onToast(`Could not update: ${error.message}`);
    } else {
      setCards((prev) => prev.slice(1));
      setShowAnswer(false);
    }
    setBusy(false);
  };

  // Back to overview
  const handleBack = () => {
    setView("overview");
    setSelectedLesson(null);
    setCards([]);
    loadTotalDue();
  };

  return (
    <div>
      {/* OVERVIEW */}
      {view === "overview" && (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Your Study Dashboard</h1>
              <p className="mt-1 text-sm text-slate-400">Practice your mistakes and track progress.</p>
            </div>
            <AvatarWidget profile={profile} onToast={onToast} onUpdateProfile={onUpdateProfile} />
          </div>

          {/* Practice All Card */}
          <button
            onClick={handlePracticeAll}
            className="w-full rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-6 text-left transition hover:border-emerald-500/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Practice All Words</h2>
                <p className="mt-1 text-sm text-slate-400">Review all your mistakes from every lesson</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-300">
                  {totalDue} due
                </span>
                <span className="text-emerald-400">→</span>
              </div>
            </div>
          </button>

          {/* Lessons */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-white">Your Lessons</h2>
            {lessons.length > 0 ? (
              <div className="space-y-2">
                {lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => handlePracticeLesson(lesson)}
                    className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-emerald-500/50 hover:bg-emerald-500/5"
                  >
                    <div>
                      <p className="font-medium text-white">{lesson.title || "Untitled Lesson"}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(lesson.started_at).toLocaleDateString()} • {lesson.word_count ?? 0} words
                      </p>
                    </div>
                    <span className="text-slate-600">Practice →</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 text-slate-500">
                No lessons yet. Ask your teacher to create one!
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRACTICE VIEW */}
      {(view === "practice-lesson" || view === "practice-all") && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              ← Back to overview
            </button>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-300">
              {cards.length} remaining
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              {view === "practice-all" ? "Practice All Words" : `Practice: ${selectedLesson?.title || "Lesson"}`}
            </h1>
          </div>

          {/* Flashcard */}
          {currentCard ? (
            <div className="space-y-4">
              <div
                onClick={() => setShowAnswer(true)}
                className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-8 text-center transition hover:border-white/20"
              >
                <p className="mb-2 text-xs text-slate-500">
                  {currentCard.lesson_word?.lesson?.title || "Lesson"}
                </p>
                <p className="text-3xl font-bold text-white">
                  {currentCard.lesson_word?.term}
                </p>
                
                {showAnswer ? (
                  <>
                    {currentCard.lesson_word?.translation && (
                      <p className="mt-6 text-xl text-emerald-300">
                        {currentCard.lesson_word.translation}
                      </p>
                    )}
                    {currentCard.lesson_word?.note && (
                      <p className="mt-3 text-sm text-slate-400">
                        {currentCard.lesson_word.note}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-6 text-sm text-slate-500">
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
                <span>Reviews: {currentCard.repetitions ?? 0}</span>
              </div>

              {/* Action Buttons */}
              {showAnswer && (
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => reviewCard("again")}
                    disabled={busy}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 py-4 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Again
                  </button>
                  <button
                    onClick={() => reviewCard("hard")}
                    disabled={busy}
                    className="rounded-xl border border-amber-500/30 bg-amber-500/10 py-4 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    Hard
                  </button>
                  <button
                    onClick={() => reviewCard("good")}
                    disabled={busy}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-emerald-500/30 disabled:opacity-50"
                  >
                    Got it!
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
              <div className="mb-3 text-4xl">🎉</div>
              <p className="font-medium text-white">All done!</p>
              <p className="mt-1 text-sm text-slate-500">
                {view === "practice-all" 
                  ? "You've reviewed all your cards. Great job!"
                  : "No more cards in this lesson."}
              </p>
              <button
                onClick={handleBack}
                className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              >
                Back to overview
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
