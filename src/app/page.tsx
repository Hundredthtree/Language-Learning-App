"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { nextReview, type Grade } from "@/lib/spacedRepetition";
import type { Lesson, LessonWord, Profile, ReviewCard, Role } from "@/types/domain";
import { Logo } from "@/components/Logo";
import { LiquidEther } from "@/components/LiquidEther";

type AuthMode = "sign-in" | "sign-up";
type Theme = "light" | "dark";

// ============================================
// THEME TOGGLE
// ============================================

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    } else {
      // Default to light mode
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  if (!mounted) {
    return (
      <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] transition hover:bg-[var(--background-tertiary)]">
        <div className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] transition hover:bg-[var(--background-tertiary)] overflow-hidden"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {/* Moon icon (visible in dark mode) */}
      <svg
        className={`absolute h-4 w-4 text-rose-400 transition-all duration-300 ${
          theme === "dark" 
            ? "rotate-0 scale-100 opacity-100" 
            : "-rotate-90 scale-0 opacity-0"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
      {/* Sun icon (visible in light mode) */}
      <svg
        className={`absolute h-4 w-4 text-amber-500 transition-all duration-300 ${
          theme === "light" 
            ? "rotate-0 scale-100 opacity-100" 
            : "rotate-90 scale-0 opacity-0"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    </button>
  );
}

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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--nav-bg)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Logo withText />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {session && (
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--foreground-secondary)] transition hover:bg-[var(--background-tertiary)]"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Not configured */}
        {!supabase && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
            Supabase not configured. Set environment variables.
          </div>
        )}

        {/* Auth */}
        {!session && (
          <>
            <LiquidEther />
            <div className="relative z-10 flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center">
              <div className="mb-12 text-center">
                <h1 className="bg-gradient-to-r from-[var(--foreground)] via-[var(--foreground)] to-[var(--foreground-secondary)] bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
                  Учись с Ксенией
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--foreground-secondary)]">
                  Learn Russian the smart way. Track your mistakes and master them 
                  with spaced repetition.
                </p>
              </div>
              <AuthPanel mode={authMode} onModeChange={setAuthMode} onToast={setToast} />
            </div>
          </>
        )}

        {/* Loading */}
        {loading && session && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          </div>
        )}

        {/* Error state - session exists but profile failed to load */}
        {session && !profile && !loading && (
          <div className="mx-auto max-w-md text-center py-12">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">Profile Error</h2>
              <p className="text-sm text-[var(--foreground-secondary)] mb-4">
                Could not load your profile. This may be a temporary issue.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => session?.user && loadProfile(session.user.id)}
                  className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
                >
                  Retry
                </button>
                <button
                  onClick={handleSignOut}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)]"
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
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--toast-bg)] px-4 py-3 text-sm text-[var(--foreground)] shadow-xl backdrop-blur-sm">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]">✕</button>
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
  const [role, setRole] = useState<Role>("student");
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
      <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl drop-shadow-lg">
        {/* Auth mode tabs with sliding background */}
        <div className="relative mb-6 flex rounded-lg bg-black/5 p-1">
          {/* Sliding background indicator */}
          <div
            className="absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] rounded-md bg-gradient-to-r from-rose-500 to-pink-600 shadow-lg shadow-rose-500/25"
            style={{
              transform: mode === "sign-in" ? "translateX(0)" : "translateX(calc(100% + 4px))",
              transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
          <button
            onClick={() => onModeChange("sign-in")}
            className={`relative z-10 flex-1 rounded-md py-2 text-sm font-medium ${
              mode === "sign-in" ? "text-white" : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
            }`}
            style={{ transition: "color 200ms" }}
          >
            Sign in
          </button>
          <button
            onClick={() => onModeChange("sign-up")}
            className={`relative z-10 flex-1 rounded-md py-2 text-sm font-medium ${
              mode === "sign-up" ? "text-white" : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
            }`}
            style={{ transition: "color 200ms" }}
          >
            Create account
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/30 bg-white/50 px-3 py-2.5 text-gray-900 placeholder-gray-500 outline-none backdrop-blur-sm focus:border-rose-500 focus:bg-white/70"
              type="email"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/30 bg-white/50 px-3 py-2.5 text-gray-900 placeholder-gray-500 outline-none backdrop-blur-sm focus:border-rose-500 focus:bg-white/70"
              type="password"
              placeholder="••••••••"
            />
          </div>
          {mode === "sign-up" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Your name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-white/30 bg-white/50 px-3 py-2.5 text-gray-900 placeholder-gray-500 outline-none backdrop-blur-sm focus:border-rose-500 focus:bg-white/70"
                  placeholder="Alex"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">I am a...</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["teacher", "student"] as Role[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setRole(v)}
                      type="button"
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition backdrop-blur-sm ${
                        role === v
                          ? v === "teacher"
                            ? "border-rose-500 bg-rose-500/20 text-rose-600"
                            : "border-emerald-500 bg-emerald-500/20 text-emerald-600"
                          : "border-white/30 bg-white/30 text-gray-600 hover:bg-white/50 hover:text-gray-900"
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
          className="mt-6 w-full rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:shadow-rose-500/40 disabled:opacity-50"
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
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState(profile.display_name || "");
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
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

  const handleSaveName = async () => {
    if (!supabase) return;
    const trimmedName = newName.trim();
    if (!trimmedName) {
      onToast("Name cannot be empty");
      return;
    }
    
    setSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: trimmedName })
      .eq('id', profile.id);

    if (error) {
      onToast(`Could not update name: ${error.message}`);
    } else {
      onToast('Name updated!');
      onUpdateProfile({ ...profile, display_name: trimmedName });
      setShowNameModal(false);
    }
    setSavingName(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 transition hover:bg-[var(--background-tertiary)]"
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
                ? 'bg-rose-500/20 text-rose-400' 
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {(profile.display_name || profile.email || '?')[0].toUpperCase()}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {profile.display_name || profile.email}
          </p>
          <p className={`text-xs ${
            profile.role === 'teacher' ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
          </p>
        </div>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-[var(--border)] bg-[var(--toast-bg)] p-2 shadow-xl backdrop-blur-sm">
            <button
              onClick={() => { setShowNameModal(true); setNewName(profile.display_name || ""); setShowMenu(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--foreground-secondary)] transition hover:bg-[var(--background-tertiary)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Change name
            </button>
            <button
              onClick={() => { handleAvatarClick(); setShowMenu(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--foreground-secondary)] transition hover:bg-[var(--background-tertiary)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Change avatar
            </button>
          </div>
        </>
      )}

      {/* Name Edit Modal */}
      {showNameModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowNameModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Change your name</h3>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-[var(--foreground)] placeholder-[var(--foreground-muted)] outline-none focus:border-rose-500"
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              autoFocus
            />
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setShowNameModal(false)}
                className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--foreground-secondary)] transition hover:bg-[var(--background-tertiary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {savingName ? "Saving..." : "Save"}
              </button>
            </div>
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

type TeacherView = "students" | "lessons" | "lesson-detail" | "student-words";

type StudentWordWithStats = {
  id: string;
  term: string;
  translation: string | null;
  note: string | null;
  lesson_title: string | null;
  lesson_date: string;
  ease: number;
  interval_days: number;
  repetitions: number;
  total_success: number;
  total_fail: number;
  due_at: string;
};

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
  const [studentWords, setStudentWords] = useState<StudentWordWithStats[]>([]);
  const [selectedWordDetail, setSelectedWordDetail] = useState<StudentWordWithStats | null>(null);
  const [wordSearchQuery, setWordSearchQuery] = useState("");
  const [linkEmail, setLinkEmail] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [wordForm, setWordForm] = useState({ term: "", translation: "", note: "" });
  const [busy, setBusy] = useState(false);

  // Load students
  const loadStudents = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("teacher_students")
      .select("student:profiles!teacher_students_student_id_fkey(id, display_name, email, role, avatar_url)")
      .eq("teacher_id", profile.id)
      .order("created_at", { ascending: false });
    if (error) {
      onToast(`Could not load students: ${error.message}`);
    } else {
      type Row = { student: Profile | null };
      const mapped = ((data as unknown as Row[]) ?? []).map((r) => r.student).filter(Boolean) as Profile[];
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

  // Load all words for a student with their review stats
  const loadStudentWords = useCallback(async () => {
    if (!supabase || !selectedStudent) return;
    const { data, error } = await supabase
      .from("review_cards")
      .select(`
        id, ease, interval_days, repetitions, due_at, total_success, total_fail,
        lesson_word:lesson_word_id(
          id, term, translation, note,
          lesson:lesson_id(id, title, started_at, teacher_id)
        )
      `)
      .eq("student_id", selectedStudent.id)
      .order("due_at", { ascending: true });

    if (error) {
      onToast(`Could not load student words: ${error.message}`);
    } else {
      type CardRow = {
        id: string;
        ease: number;
        interval_days: number;
        repetitions: number;
        due_at: string;
        total_success: number;
        total_fail: number;
        lesson_word: {
          id: string;
          term: string;
          translation: string | null;
          note: string | null;
          lesson: { id: string; title: string | null; started_at: string; teacher_id: string } | null;
        } | null;
      };
      // Filter to only show words from this teacher's lessons
      const mapped: StudentWordWithStats[] = ((data as CardRow[]) ?? [])
        .filter(r => r.lesson_word && r.lesson_word.lesson?.teacher_id === profile.id)
        .map(r => ({
          id: r.lesson_word!.id,
          term: r.lesson_word!.term,
          translation: r.lesson_word!.translation,
          note: r.lesson_word!.note,
          lesson_title: r.lesson_word!.lesson?.title || null,
          lesson_date: r.lesson_word!.lesson?.started_at || "",
          ease: r.ease,
          interval_days: r.interval_days,
          repetitions: r.repetitions,
          total_success: r.total_success,
          total_fail: r.total_fail,
          due_at: r.due_at,
        }));
      setStudentWords(mapped);
    }
  }, [onToast, selectedStudent, profile.id]);

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

  // View all words for a student
  const handleViewStudentWords = async () => {
    await loadStudentWords();
    setView("student-words");
  };

  // Filter words by search query
  const filteredStudentWords = studentWords.filter(word => 
    word.term.toLowerCase().includes(wordSearchQuery.toLowerCase()) ||
    (word.translation?.toLowerCase().includes(wordSearchQuery.toLowerCase())) ||
    (word.lesson_title?.toLowerCase().includes(wordSearchQuery.toLowerCase()))
  );

  // Get mastery level for teacher view
  const getStudentMasteryLevel = (word: StudentWordWithStats) => {
    const total = word.total_success + word.total_fail;
    if (total === 0) return { level: "New", color: "text-slate-400", bg: "bg-slate-500/10" };
    const ratio = word.total_success / total;
    if (word.interval_days >= 21 && ratio >= 0.8) return { level: "Mastered", color: "text-emerald-400", bg: "bg-emerald-500/10" };
    if (word.interval_days >= 7 && ratio >= 0.6) return { level: "Learning", color: "text-amber-400", bg: "bg-amber-500/10" };
    return { level: "Struggling", color: "text-red-400", bg: "bg-red-500/10" };
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
        onClick={() => { setView("students"); setSelectedStudent(null); setSelectedLesson(null); setWordSearchQuery(""); }}
        className={`transition ${view === "students" ? "text-[var(--foreground)] font-medium" : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"}`}
      >
        Students
      </button>
      {selectedStudent && (
        <>
          <span className="text-[var(--foreground-muted)]">/</span>
          <button
            onClick={() => { setView("lessons"); setSelectedLesson(null); setWordSearchQuery(""); }}
            className={`transition ${view === "lessons" || view === "student-words" ? "text-[var(--foreground)] font-medium" : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"}`}
          >
            {selectedStudent.display_name || selectedStudent.email}
          </button>
        </>
      )}
      {selectedLesson && view === "lesson-detail" && (
        <>
          <span className="text-[var(--foreground-muted)]">/</span>
          <span className="text-[var(--foreground)] font-medium">{selectedLesson.title || "Lesson"}</span>
        </>
      )}
      {view === "student-words" && (
        <>
          <span className="text-[var(--foreground-muted)]">/</span>
          <span className="text-[var(--foreground)] font-medium">Progress</span>
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
              <h1 className="text-2xl font-bold text-[var(--foreground)]">Your Students</h1>
              <p className="mt-1 text-sm text-[var(--foreground-secondary)]">Invite students or select one to manage their lessons.</p>
            </div>
            <AvatarWidget profile={profile} onToast={onToast} onUpdateProfile={onUpdateProfile} />
          </div>

          {/* Invite Card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Invite a Student</h2>
            <p className="mb-4 text-xs text-[var(--foreground-muted)]">The student must have created an account first.</p>
            <div className="flex gap-2">
              <input
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                placeholder="student@email.com"
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-[var(--foreground)] placeholder-[var(--foreground-muted)] outline-none focus:border-rose-500"
                onKeyDown={(e) => e.key === "Enter" && handleLinkStudent()}
              />
              <button
                onClick={handleLinkStudent}
                disabled={busy}
                className="rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-600 disabled:opacity-50"
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
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 text-left transition hover:border-rose-500/50 hover:bg-rose-500/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                    {(student.display_name || student.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--foreground)] truncate">{student.display_name || "Unnamed"}</p>
                    <p className="text-xs text-[var(--foreground-muted)] truncate">{student.email}</p>
                  </div>
                  <span className="text-[var(--foreground-muted)]">→</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-[var(--foreground-muted)]">
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
              <h1 className="text-2xl font-bold text-[var(--foreground)]">
                Lessons with {selectedStudent.display_name || selectedStudent.email}
              </h1>
              <p className="mt-1 text-sm text-[var(--foreground-secondary)]">Create a new lesson or continue an existing one.</p>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* New Lesson Card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/20">
                  <svg className="h-5 w-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--foreground)]">New Lesson</h2>
                  <p className="text-xs text-[var(--foreground-secondary)]">Start teaching</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Lesson title (optional)"
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] outline-none focus:border-rose-500"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateLesson()}
                />
                <button
                  onClick={handleCreateLesson}
                  disabled={busy}
                  className="rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-600 disabled:opacity-50"
                >
                  Start
                </button>
              </div>
            </div>

            {/* View All Words Card */}
            <button
              onClick={handleViewStudentWords}
              className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-5 text-left transition hover:border-emerald-500/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--foreground)]">Progress</h2>
                  <p className="text-xs text-[var(--foreground-secondary)]">View all words & stats</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
                  {lessons.reduce((acc, l) => acc + (l.word_count ?? 0), 0)} words
                </span>
                <span className="text-emerald-400">→</span>
              </div>
            </button>
          </div>

          {/* Lessons List */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Lessons</h2>
            {lessons.length > 0 ? (
              <div className="space-y-2">
                {lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelectLesson(lesson)}
                    className="w-full flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 text-left transition hover:border-rose-500/50 hover:bg-rose-500/5"
                  >
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{lesson.title || "Untitled Lesson"}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {new Date(lesson.started_at).toLocaleDateString()} • {lesson.word_count ?? 0} words
                      </p>
                    </div>
                    <span className="text-[var(--foreground-muted)]">→</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-[var(--foreground-muted)]">
                No lessons yet. Start one above!
              </div>
            )}
          </div>
        </div>
      )}

      {/* LESSON DETAIL VIEW */}
      {view === "lesson-detail" && selectedLesson && selectedStudent && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{selectedLesson.title || "Lesson"}</h1>
            <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
              With {selectedStudent.display_name || selectedStudent.email} • {new Date(selectedLesson.started_at).toLocaleDateString()}
            </p>
          </div>

          {/* Add Word Form */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5">
            <h2 className="mb-4 text-sm font-semibold text-[var(--foreground)]">Add Mistake</h2>
            <div className="space-y-3">
              <input
                value={wordForm.term}
                onChange={(e) => setWordForm((p) => ({ ...p, term: e.target.value }))}
                placeholder="Word or phrase they got wrong"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-[var(--foreground)] placeholder-[var(--foreground-muted)] outline-none focus:border-rose-500"
              />
              <input
                value={wordForm.translation}
                onChange={(e) => setWordForm((p) => ({ ...p, translation: e.target.value }))}
                placeholder="Correct meaning / translation"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-[var(--foreground)] placeholder-[var(--foreground-muted)] outline-none focus:border-rose-500"
              />
              <textarea
                value={wordForm.note}
                onChange={(e) => setWordForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="Notes or explanation (optional)"
                rows={2}
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-[var(--foreground)] placeholder-[var(--foreground-muted)] outline-none focus:border-rose-500"
              />
              <button
                onClick={handleAddWord}
                disabled={busy}
                className="w-full rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:shadow-rose-500/30 disabled:opacity-50"
              >
                Add to Lesson
              </button>
            </div>
          </div>

          {/* Words in this lesson */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
              Words in this lesson ({lessonWords.length})
            </h2>
            {lessonWords.length > 0 ? (
              <div className="space-y-2">
                {lessonWords.map((word) => (
                  <div
                    key={word.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{word.term}</p>
                        {word.translation && <p className="text-sm text-[var(--foreground-secondary)]">{word.translation}</p>}
                        {word.note && <p className="mt-1 text-xs text-[var(--foreground-muted)]">{word.note}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-[var(--foreground-muted)]">
                No words added yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* STUDENT WORDS VIEW */}
      {view === "student-words" && selectedStudent && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView("lessons")}
              className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)] transition hover:text-[var(--foreground)]"
            >
              ← Back to lessons
            </button>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
              {studentWords.length} words
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              {selectedStudent.display_name || selectedStudent.email}&apos;s Progress
            </h1>
            <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
              View all words and their learning progress
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={wordSearchQuery}
              onChange={(e) => setWordSearchQuery(e.target.value)}
              placeholder="Search words, translations, or lessons..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] py-2.5 pl-10 pr-4 text-[var(--foreground)] placeholder-[var(--foreground-muted)] outline-none focus:border-rose-500"
            />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 text-center">
              <p className="text-xl font-bold text-[var(--foreground)]">{studentWords.length}</p>
              <p className="text-xs text-[var(--foreground-muted)]">Total Words</p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
              <p className="text-xl font-bold text-emerald-400">
                {studentWords.filter(w => getStudentMasteryLevel(w).level === "Mastered").length}
              </p>
              <p className="text-xs text-[var(--foreground-muted)]">Mastered</p>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
              <p className="text-xl font-bold text-amber-400">
                {studentWords.filter(w => getStudentMasteryLevel(w).level === "Learning").length}
              </p>
              <p className="text-xs text-[var(--foreground-muted)]">Learning</p>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
              <p className="text-xl font-bold text-red-400">
                {studentWords.filter(w => getStudentMasteryLevel(w).level === "Struggling").length}
              </p>
              <p className="text-xs text-[var(--foreground-muted)]">Struggling</p>
            </div>
          </div>

          {/* Word List */}
          {filteredStudentWords.length > 0 ? (
            <div className="space-y-2">
              {filteredStudentWords.map((word) => {
                const mastery = getStudentMasteryLevel(word);
                const isDue = new Date(word.due_at) <= new Date();
                return (
                  <button
                    key={word.id}
                    onClick={() => setSelectedWordDetail(word)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 text-left transition hover:border-emerald-500/50 hover:bg-emerald-500/5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[var(--foreground)] truncate">{word.term}</p>
                          {isDue && (
                            <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                              DUE
                            </span>
                          )}
                        </div>
                        {word.translation && (
                          <p className="mt-0.5 text-sm text-[var(--foreground-secondary)] truncate">{word.translation}</p>
                        )}
                        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                          {word.lesson_title || "Lesson"} • {new Date(word.lesson_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${mastery.bg} ${mastery.color}`}>
                          {mastery.level}
                        </span>
                        <span className="text-xs text-[var(--foreground-muted)]">
                          {word.total_success}/{word.total_success + word.total_fail} correct
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-[var(--foreground-muted)]">
              {wordSearchQuery ? "No words match your search" : "No words yet for this student"}
            </div>
          )}
        </div>
      )}

      {/* Word Detail Modal (Teacher View) */}
      {selectedWordDetail && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedWordDetail(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-[var(--foreground)]">{selectedWordDetail.term}</h3>
                {selectedWordDetail.translation && (
                  <p className="mt-1 text-lg text-emerald-500">{selectedWordDetail.translation}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedWordDetail(null)}
                className="rounded-lg p-1 text-[var(--foreground-muted)] transition hover:bg-[var(--background-tertiary)] hover:text-[var(--foreground)]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedWordDetail.note && (
              <div className="mb-4 rounded-lg bg-[var(--background-tertiary)] p-3">
                <p className="text-sm text-[var(--foreground-secondary)]">{selectedWordDetail.note}</p>
              </div>
            )}

            <div className="mb-4 text-sm text-[var(--foreground-muted)]">
              From: {selectedWordDetail.lesson_title || "Lesson"} • {new Date(selectedWordDetail.lesson_date).toLocaleDateString()}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 text-center">
                <p className="text-2xl font-bold text-[var(--foreground)]">{selectedWordDetail.repetitions}</p>
                <p className="text-xs text-[var(--foreground-muted)]">Reviews</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">
                  {selectedWordDetail.total_success + selectedWordDetail.total_fail > 0 
                    ? Math.round((selectedWordDetail.total_success / (selectedWordDetail.total_success + selectedWordDetail.total_fail)) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">Success Rate</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 text-center">
                <p className="text-2xl font-bold text-[var(--foreground)]">{selectedWordDetail.interval_days}d</p>
                <p className="text-xs text-[var(--foreground-muted)]">Interval</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 text-center">
                <p className="text-2xl font-bold text-[var(--foreground)]">{selectedWordDetail.ease.toFixed(1)}</p>
                <p className="text-xs text-[var(--foreground-muted)]">Ease Factor</p>
              </div>
            </div>

            {/* Next review */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 text-center">
              <p className="text-xs text-[var(--foreground-muted)] mb-1">Next Review</p>
              <p className={`font-semibold ${new Date(selectedWordDetail.due_at) <= new Date() ? 'text-emerald-400' : 'text-[var(--foreground)]'}`}>
                {new Date(selectedWordDetail.due_at) <= new Date() 
                  ? "Due now!" 
                  : new Date(selectedWordDetail.due_at).toLocaleDateString()}
              </p>
            </div>

            <button
              onClick={() => setSelectedWordDetail(null)}
              className="mt-4 w-full rounded-lg bg-[var(--background-tertiary)] py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--border)]"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// STUDENT DASHBOARD
// ============================================

type StudentView = "overview" | "practice-lesson" | "practice-all" | "word-library";

type WordWithStats = {
  id: string;
  term: string;
  translation: string | null;
  note: string | null;
  lesson_title: string | null;
  lesson_date: string;
  ease: number;
  interval_days: number;
  repetitions: number;
  total_success: number;
  total_fail: number;
  due_at: string;
};

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
  const [allWords, setAllWords] = useState<WordWithStats[]>([]);
  const [selectedWord, setSelectedWord] = useState<WordWithStats | null>(null);
  const [wordSearchQuery, setWordSearchQuery] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Load all words with their stats for the word library
  const loadAllWords = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("review_cards")
      .select(`
        id, ease, interval_days, repetitions, due_at, total_success, total_fail,
        lesson_word:lesson_word_id(
          id, term, translation, note,
          lesson:lesson_id(id, title, started_at)
        )
      `)
      .eq("student_id", profile.id)
      .order("due_at", { ascending: true });

    if (error) {
      onToast(`Could not load words: ${error.message}`);
    } else {
      type CardRow = {
        id: string;
        ease: number;
        interval_days: number;
        repetitions: number;
        due_at: string;
        total_success: number;
        total_fail: number;
        lesson_word: {
          id: string;
          term: string;
          translation: string | null;
          note: string | null;
          lesson: { id: string; title: string | null; started_at: string } | null;
        } | null;
      };
      const mapped: WordWithStats[] = ((data as CardRow[]) ?? [])
        .filter(r => r.lesson_word)
        .map(r => ({
          id: r.lesson_word!.id,
          term: r.lesson_word!.term,
          translation: r.lesson_word!.translation,
          note: r.lesson_word!.note,
          lesson_title: r.lesson_word!.lesson?.title || null,
          lesson_date: r.lesson_word!.lesson?.started_at || "",
          ease: r.ease,
          interval_days: r.interval_days,
          repetitions: r.repetitions,
          total_success: r.total_success,
          total_fail: r.total_fail,
          due_at: r.due_at,
        }));
      setAllWords(mapped);
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

  // Open word library
  const handleOpenWordLibrary = async () => {
    await loadAllWords();
    setView("word-library");
  };

  // Back to overview
  const handleBack = () => {
    setView("overview");
    setSelectedLesson(null);
    setSelectedWord(null);
    setCards([]);
    setWordSearchQuery("");
    loadTotalDue();
  };

  // Delete a word
  const handleDeleteWord = async () => {
    if (!supabase || !selectedWord) return;
    setDeleting(true);
    
    // First delete the review card, then the lesson word
    const { error: cardError } = await supabase
      .from("review_cards")
      .delete()
      .eq("lesson_word_id", selectedWord.id)
      .eq("student_id", profile.id);
    
    if (cardError) {
      onToast(`Could not delete: ${cardError.message}`);
      setDeleting(false);
      return;
    }

    // Note: We only delete the review_card for this student, not the lesson_word itself
    // because the lesson_word belongs to the teacher's lesson
    
    // Update local state
    setAllWords(prev => prev.filter(w => w.id !== selectedWord.id));
    setSelectedWord(null);
    setShowDeleteConfirm(false);
    setDeleting(false);
    onToast("Word removed from your library");
    loadLessons(); // Refresh lesson word counts
  };

  // Filter words by search query
  const filteredWords = allWords.filter(word => 
    word.term.toLowerCase().includes(wordSearchQuery.toLowerCase()) ||
    (word.translation?.toLowerCase().includes(wordSearchQuery.toLowerCase())) ||
    (word.lesson_title?.toLowerCase().includes(wordSearchQuery.toLowerCase()))
  );

  // Get mastery level based on stats
  const getMasteryLevel = (word: WordWithStats) => {
    const total = word.total_success + word.total_fail;
    if (total === 0) return { level: "New", color: "text-slate-400", bg: "bg-slate-500/10" };
    const ratio = word.total_success / total;
    if (word.interval_days >= 21 && ratio >= 0.8) return { level: "Mastered", color: "text-emerald-400", bg: "bg-emerald-500/10" };
    if (word.interval_days >= 7 && ratio >= 0.6) return { level: "Learning", color: "text-amber-400", bg: "bg-amber-500/10" };
    return { level: "Struggling", color: "text-red-400", bg: "bg-red-500/10" };
  };

  return (
    <div>
      {/* OVERVIEW */}
      {view === "overview" && (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">Your Study Dashboard</h1>
              <p className="mt-1 text-sm text-[var(--foreground-secondary)]">Practice your mistakes and track progress.</p>
            </div>
            <AvatarWidget profile={profile} onToast={onToast} onUpdateProfile={onUpdateProfile} />
          </div>

          {/* Action Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Practice All Card */}
            <button
              onClick={handlePracticeAll}
              className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-5 text-left transition hover:border-emerald-500/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--foreground)]">Practice</h2>
                  <p className="text-xs text-[var(--foreground-secondary)]">Review due words</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
                  {totalDue} due
                </span>
                <span className="text-emerald-400">→</span>
              </div>
            </button>

            {/* Word Library Card */}
            <button
              onClick={handleOpenWordLibrary}
              className="rounded-xl border border-sky-500/30 bg-gradient-to-r from-sky-500/10 to-blue-600/10 p-5 text-left transition hover:border-sky-500/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20">
                  <svg className="h-5 w-5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--foreground)]">Word Library</h2>
                  <p className="text-xs text-[var(--foreground-secondary)]">All your learned words</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-sky-500/20 px-3 py-1 text-sm font-medium text-sky-500">
                  {lessons.reduce((acc, l) => acc + (l.word_count ?? 0), 0)} words
                </span>
                <span className="text-sky-500">→</span>
              </div>
            </button>
          </div>

          {/* Lessons */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Your Lessons</h2>
            {lessons.length > 0 ? (
              <div className="space-y-2">
                {lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => handlePracticeLesson(lesson)}
                    className="w-full flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 text-left transition hover:border-emerald-500/50 hover:bg-emerald-500/5"
                  >
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{lesson.title || "Untitled Lesson"}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {new Date(lesson.started_at).toLocaleDateString()} • {lesson.word_count ?? 0} words
                      </p>
                    </div>
                    <span className="text-[var(--foreground-muted)]">Practice →</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-[var(--foreground-muted)]">
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
              className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)] transition hover:text-[var(--foreground)]"
            >
              ← Back to overview
            </button>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
              {cards.length} remaining
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              {view === "practice-all" ? "Practice All Words" : `Practice: ${selectedLesson?.title || "Lesson"}`}
            </h1>
          </div>

          {/* Flashcard */}
          {currentCard ? (
            <div className="space-y-4">
              <div
                onClick={() => setShowAnswer(true)}
                className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--background-secondary)] to-[var(--card-bg)] p-8 text-center transition hover:border-[var(--border-hover)]"
              >
                <p className="mb-2 text-xs text-[var(--foreground-muted)]">
                  {currentCard.lesson_word?.lesson?.title || "Lesson"}
                </p>
                <p className="text-3xl font-bold text-[var(--foreground)]">
                  {currentCard.lesson_word?.term}
                </p>
                
                {showAnswer ? (
                  <>
                    {currentCard.lesson_word?.translation && (
                      <p className="mt-6 text-xl text-emerald-500">
                        {currentCard.lesson_word.translation}
                      </p>
                    )}
                    {currentCard.lesson_word?.note && (
                      <p className="mt-3 text-sm text-[var(--foreground-secondary)]">
                        {currentCard.lesson_word.note}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-6 text-sm text-[var(--foreground-muted)]">
                    Tap to reveal answer
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex justify-center gap-4 text-xs text-[var(--foreground-muted)]">
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
                    className="rounded-xl border border-red-500/30 bg-red-500/10 py-4 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Again
                  </button>
                  <button
                    onClick={() => reviewCard("hard")}
                    disabled={busy}
                    className="rounded-xl border border-amber-500/30 bg-amber-500/10 py-4 text-sm font-medium text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-50"
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
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] text-center">
              <div className="mb-3 text-4xl">🎉</div>
              <p className="font-medium text-[var(--foreground)]">All done!</p>
              <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                {view === "practice-all" 
                  ? "You've reviewed all your cards. Great job!"
                  : "No more cards in this lesson."}
              </p>
              <button
                onClick={handleBack}
                className="mt-4 rounded-lg bg-[var(--background-tertiary)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--border)]"
              >
                Back to overview
              </button>
            </div>
          )}
        </div>
      )}

      {/* WORD LIBRARY VIEW */}
      {view === "word-library" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)] transition hover:text-[var(--foreground)]"
            >
              ← Back to overview
            </button>
            <span className="rounded-full bg-sky-500/20 px-3 py-1 text-sm font-medium text-sky-500">
              {allWords.length} words
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Word Library</h1>
            <p className="mt-1 text-sm text-[var(--foreground-secondary)]">All the words you&apos;ve learned across your lessons</p>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={wordSearchQuery}
              onChange={(e) => setWordSearchQuery(e.target.value)}
              placeholder="Search words, translations, or lessons..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] py-2.5 pl-10 pr-4 text-[var(--foreground)] placeholder-[var(--foreground-muted)] outline-none focus:border-sky-500"
            />
          </div>

          {/* Word List */}
          {filteredWords.length > 0 ? (
            <div className="space-y-2">
              {filteredWords.map((word) => {
                const mastery = getMasteryLevel(word);
                const isDue = new Date(word.due_at) <= new Date();
                return (
                  <button
                    key={word.id}
                    onClick={() => setSelectedWord(word)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 text-left transition hover:border-sky-500/50 hover:bg-sky-500/5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[var(--foreground)] truncate">{word.term}</p>
                          {isDue && (
                            <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                              DUE
                            </span>
                          )}
                        </div>
                        {word.translation && (
                          <p className="mt-0.5 text-sm text-[var(--foreground-secondary)] truncate">{word.translation}</p>
                        )}
                        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                          {word.lesson_title || "Lesson"} • {new Date(word.lesson_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${mastery.bg} ${mastery.color}`}>
                          {mastery.level}
                        </span>
                        <span className="text-xs text-[var(--foreground-muted)]">
                          {word.total_success}/{word.total_success + word.total_fail} correct
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-[var(--foreground-muted)]">
              {wordSearchQuery ? "No words match your search" : "No words yet. Start learning!"}
            </div>
          )}
        </div>
      )}

      {/* Word Detail Modal */}
      {selectedWord && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedWord(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-[var(--foreground)]">{selectedWord.term}</h3>
                {selectedWord.translation && (
                  <p className="mt-1 text-lg text-emerald-500">{selectedWord.translation}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedWord(null)}
                className="rounded-lg p-1 text-[var(--foreground-muted)] transition hover:bg-[var(--background-tertiary)] hover:text-[var(--foreground)]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedWord.note && (
              <div className="mb-4 rounded-lg bg-[var(--background-tertiary)] p-3">
                <p className="text-sm text-[var(--foreground-secondary)]">{selectedWord.note}</p>
              </div>
            )}

            <div className="mb-4 text-sm text-[var(--foreground-muted)]">
              From: {selectedWord.lesson_title || "Lesson"} • {new Date(selectedWord.lesson_date).toLocaleDateString()}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 text-center">
                <p className="text-2xl font-bold text-[var(--foreground)]">{selectedWord.repetitions}</p>
                <p className="text-xs text-[var(--foreground-muted)]">Reviews</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">
                  {selectedWord.total_success + selectedWord.total_fail > 0 
                    ? Math.round((selectedWord.total_success / (selectedWord.total_success + selectedWord.total_fail)) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">Success Rate</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 text-center">
                <p className="text-2xl font-bold text-[var(--foreground)]">{selectedWord.interval_days}d</p>
                <p className="text-xs text-[var(--foreground-muted)]">Interval</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 text-center">
                <p className="text-2xl font-bold text-[var(--foreground)]">{selectedWord.ease.toFixed(1)}</p>
                <p className="text-xs text-[var(--foreground-muted)]">Ease Factor</p>
              </div>
            </div>

            {/* Next review */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 text-center">
              <p className="text-xs text-[var(--foreground-muted)] mb-1">Next Review</p>
              <p className={`font-semibold ${new Date(selectedWord.due_at) <= new Date() ? 'text-emerald-400' : 'text-[var(--foreground)]'}`}>
                {new Date(selectedWord.due_at) <= new Date() 
                  ? "Due now!" 
                  : new Date(selectedWord.due_at).toLocaleDateString()}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSelectedWord(null)}
                className="flex-1 rounded-lg bg-[var(--background-tertiary)] py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--border)]"
              >
                Close
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-500/20"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedWord && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed left-1/2 top-1/2 z-[70] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mx-auto">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="mb-2 text-center text-lg font-bold text-[var(--foreground)]">Delete Word?</h3>
            <p className="mb-6 text-center text-sm text-[var(--foreground-secondary)]">
              Are you sure you want to remove <span className="font-semibold text-[var(--foreground)]">&quot;{selectedWord.term}&quot;</span> from your library? This will reset all your progress for this word.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-lg bg-[var(--background-tertiary)] py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--border)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWord}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
