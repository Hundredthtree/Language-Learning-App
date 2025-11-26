export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      lesson_words: {
        Row: {
          created_at: string | null
          id: string
          lesson_id: string | null
          note: string | null
          term: string
          translation: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          note?: string | null
          term: string
          translation?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          note?: string | null
          term?: string
          translation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_words_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          id: string
          started_at: string | null
          student_id: string | null
          teacher_id: string | null
          title: string | null
        }
        Insert: {
          id?: string
          started_at?: string | null
          student_id?: string | null
          teacher_id?: string | null
          title?: string | null
        }
        Update: {
          id?: string
          started_at?: string | null
          student_id?: string | null
          teacher_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          role: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      review_cards: {
        Row: {
          created_at: string | null
          due_at: string | null
          ease: number | null
          id: string
          interval_days: number | null
          lesson_word_id: string | null
          repetitions: number | null
          student_id: string | null
          total_fail: number | null
          total_success: number | null
        }
        Insert: {
          created_at?: string | null
          due_at?: string | null
          ease?: number | null
          id?: string
          interval_days?: number | null
          lesson_word_id?: string | null
          repetitions?: number | null
          student_id?: string | null
          total_fail?: number | null
          total_success?: number | null
        }
        Update: {
          created_at?: string | null
          due_at?: string | null
          ease?: number | null
          id?: string
          interval_days?: number | null
          lesson_word_id?: string | null
          repetitions?: number | null
          student_id?: string | null
          total_fail?: number | null
          total_success?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "review_cards_lesson_word_id_fkey"
            columns: ["lesson_word_id"]
            isOneToOne: false
            referencedRelation: "lesson_words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_students: {
        Row: {
          created_at: string | null
          student_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          student_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

