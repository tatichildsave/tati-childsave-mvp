export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          actor_id: string
          child_profile_id: string | null
          created_at: string
          entity_id: string | null
          event_key: string | null
          event_name: string
          id: string
          occurred_at: string
        }
        Insert: {
          actor_id?: string
          child_profile_id?: string | null
          created_at?: string
          entity_id?: string | null
          event_key?: string | null
          event_name: string
          id?: string
          occurred_at?: string
        }
        Update: {
          actor_id?: string
          child_profile_id?: string | null
          created_at?: string
          entity_id?: string | null
          event_key?: string | null
          event_name?: string
          id?: string
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          assessment_id: string
          assessment_type: string
          child_profile_id: string
          competency_scores: Json
          completed_at: string
          created_at: string
          id: string
          max_points: number
          points: number
          status: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          assessment_type?: string
          child_profile_id: string
          competency_scores?: Json
          completed_at?: string
          created_at?: string
          id?: string
          max_points?: number
          points?: number
          status?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          assessment_type?: string
          child_profile_id?: string
          competency_scores?: Json
          completed_at?: string
          created_at?: string
          id?: string
          max_points?: number
          points?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          attempt_id: string
          child_profile_id: string
          competency: string
          created_at: string
          id: string
          max_points: number
          option_id: string | null
          points: number
          question_id: string
        }
        Insert: {
          attempt_id: string
          child_profile_id: string
          competency: string
          created_at?: string
          id?: string
          max_points?: number
          option_id?: string | null
          points?: number
          question_id: string
        }
        Update: {
          attempt_id?: string
          child_profile_id?: string
          competency?: string
          created_at?: string
          id?: string
          max_points?: number
          option_id?: string | null
          points?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_profiles: {
        Row: {
          age: number
          avatar: string
          created_at: string
          created_by: string
          curriculum_level: string | null
          family_id: string
          id: string
          name: string
          onboarding_completed: boolean
          onboarding_step: number
          tier: string
          updated_at: string
        }
        Insert: {
          age?: number
          avatar?: string
          created_at?: string
          created_by: string
          curriculum_level?: string | null
          family_id: string
          id?: string
          name: string
          onboarding_completed?: boolean
          onboarding_step?: number
          tier?: string
          updated_at?: string
        }
        Update: {
          age?: number
          avatar?: string
          created_at?: string
          created_by?: string
          curriculum_level?: string | null
          family_id?: string
          id?: string
          name?: string
          onboarding_completed?: boolean
          onboarding_step?: number
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_profiles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          age: number
          avatar: string
          created_at: string
          id: string
          name: string
          parent_id: string
          tier: string
        }
        Insert: {
          age?: number
          avatar?: string
          created_at?: string
          id?: string
          name: string
          parent_id: string
          tier?: string
        }
        Update: {
          age?: number
          avatar?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string
          family_id: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          answers: Json
          audience: string
          child_profile_id: string | null
          context: string
          created_at: string
          experience_key: string
          id: string
          message: string | null
          rating: number | null
          user_id: string
        }
        Insert: {
          answers?: Json
          audience?: string
          child_profile_id?: string | null
          context?: string
          created_at?: string
          experience_key?: string
          id?: string
          message?: string | null
          rating?: number | null
          user_id?: string
        }
        Update: {
          answers?: Json
          audience?: string
          child_profile_id?: string | null
          context?: string
          created_at?: string
          experience_key?: string
          id?: string
          message?: string | null
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_reviewers: {
        Row: { created_at: string; user_id: string }
        Insert: { created_at?: string; user_id: string }
        Update: { created_at?: string; user_id?: string }
        Relationships: [
          {
            foreignKeyName: "feedback_reviewers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_achievements: {
        Row: {
          achievement_id: string
          awarded_at: string
          celebrated: boolean
          child_profile_id: string
          id: string
        }
        Insert: {
          achievement_id: string
          awarded_at?: string
          celebrated?: boolean
          child_profile_id: string
          id?: string
        }
        Update: {
          achievement_id?: string
          awarded_at?: string
          celebrated?: boolean
          child_profile_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_achievements_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_progress: {
        Row: {
          child_profile_id: string
          created_at: string
          details: Json
          id: string
          item_id: string
          item_type: string
          max_score: number | null
          score: number | null
          status: string
          track_id: string
          updated_at: string
        }
        Insert: {
          child_profile_id: string
          created_at?: string
          details?: Json
          id?: string
          item_id: string
          item_type: string
          max_score?: number | null
          score?: number | null
          status?: string
          track_id?: string
          updated_at?: string
        }
        Update: {
          child_profile_id?: string
          created_at?: string
          details?: Json
          id?: string
          item_id?: string
          item_type?: string
          max_score?: number | null
          score?: number | null
          status?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_competencies: {
        Row: {
          child_profile_id: string
          competency_id: string
          evidence: Json
          id: string
          level: string
          score: number
          updated_at: string
        }
        Insert: {
          child_profile_id: string
          competency_id: string
          evidence?: Json
          id?: string
          level?: string
          score?: number
          updated_at?: string
        }
        Update: {
          child_profile_id?: string
          competency_id?: string
          evidence?: Json
          id?: string
          level?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_competencies_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_insights: {
        Row: {
          child_profile_id: string
          content: Json
          created_at: string
          created_by: string
          id: string
          insight_type: string
          read_at: string | null
        }
        Insert: {
          child_profile_id: string
          content?: Json
          created_at?: string
          created_by?: string
          id?: string
          insight_type: string
          read_at?: string | null
        }
        Update: {
          child_profile_id?: string
          content?: Json
          created_at?: string
          created_by?: string
          id?: string
          insight_type?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_insights_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_insights_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress_events: {
        Row: {
          child_id: string
          created_at: string
          details: Json
          id: string
          item_id: string
          item_type: string
          max_score: number | null
          score: number | null
          status: string
          track_id: string
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          details?: Json
          id?: string
          item_id: string
          item_type: string
          max_score?: number | null
          score?: number | null
          status?: string
          track_id?: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          details?: Json
          id?: string
          item_id?: string
          item_type?: string
          max_score?: number | null
          score?: number | null
          status?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_decisions: {
        Row: {
          child_profile_id: string
          choice_id: string
          created_at: string
          day_number: number
          details: Json
          id: string
          node_id: string
          session_id: string
        }
        Insert: {
          child_profile_id: string
          choice_id: string
          created_at?: string
          day_number?: number
          details?: Json
          id?: string
          node_id: string
          session_id: string
        }
        Update: {
          child_profile_id?: string
          choice_id?: string
          created_at?: string
          day_number?: number
          details?: Json
          id?: string
          node_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_decisions_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_decisions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "scenario_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_sessions: {
        Row: {
          child_profile_id: string
          completed_at: string | null
          created_at: string
          current_node_id: string | null
          day_number: number
          id: string
          scenario_id: string
          state: Json
          status: string
          updated_at: string
        }
        Insert: {
          child_profile_id: string
          completed_at?: string | null
          created_at?: string
          current_node_id?: string | null
          day_number?: number
          id?: string
          scenario_id: string
          state?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          child_profile_id?: string
          completed_at?: string | null
          created_at?: string
          current_node_id?: string | null
          day_number?: number
          id?: string
          scenario_id?: string
          state?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_sessions_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_family_member: { Args: { _family_id: string }; Returns: boolean }
      owns_child: { Args: { _child_id: string }; Returns: boolean }
      owns_child_profile: {
        Args: { _child_profile_id: string }
        Returns: boolean
      }
      owns_family: { Args: { _family_id: string }; Returns: boolean }
      is_feedback_reviewer: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
