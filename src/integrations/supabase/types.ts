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
      analysis_logs: {
        Row: {
          created_at: string
          id: string
          object_id: string
          snapshot: Json
        }
        Insert: {
          created_at?: string
          id?: string
          object_id: string
          snapshot: Json
        }
        Update: {
          created_at?: string
          id?: string
          object_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "analysis_logs_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          reason: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      knowledge_cases: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          detail: string | null
          featured: boolean
          id: string
          polarity: Database["public"]["Enums"]["case_polarity"]
          principles: Json
          source_url: string | null
          status: Database["public"]["Enums"]["case_status"]
          summary: string
          tags: Json
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          detail?: string | null
          featured?: boolean
          id?: string
          polarity: Database["public"]["Enums"]["case_polarity"]
          principles?: Json
          source_url?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          summary: string
          tags?: Json
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          detail?: string | null
          featured?: boolean
          id?: string
          polarity?: Database["public"]["Enums"]["case_polarity"]
          principles?: Json
          source_url?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          summary?: string
          tags?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_tags: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          merged_into: string | null
          name_en: string | null
          name_zh: string
          polarity: Database["public"]["Enums"]["tag_polarity"]
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          merged_into?: string | null
          name_en?: string | null
          name_zh: string
          polarity?: Database["public"]["Enums"]["tag_polarity"]
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          merged_into?: string | null
          name_en?: string | null
          name_zh?: string
          polarity?: Database["public"]["Enums"]["tag_polarity"]
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_tags_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "knowledge_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          object_id: string | null
          payload: Json
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          object_id?: string | null
          payload?: Json
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          object_id?: string | null
          payload?: Json
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      object_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "object_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "object_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      object_comment_reports: {
        Row: {
          comment_id: string
          created_at: string
          details: string | null
          id: string
          reason: string
          status: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          status?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "object_comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "object_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      object_comments: {
        Row: {
          body: string
          created_at: string
          helpful_count: number
          id: string
          moderation_note: string | null
          object_id: string
          parent_id: string | null
          report_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          helpful_count?: number
          id?: string
          moderation_note?: string | null
          object_id: string
          parent_id?: string | null
          report_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          helpful_count?: number
          id?: string
          moderation_note?: string | null
          object_id?: string
          parent_id?: string | null
          report_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "object_comments_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "object_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      object_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          reason: string | null
          requested_name: string
          requested_type: Database["public"]["Enums"]["object_type"]
          requester_id: string
          status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_name: string
          requested_type: Database["public"]["Enums"]["object_type"]
          requester_id: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_name?: string
          requested_type?: Database["public"]["Enums"]["object_type"]
          requester_id?: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: []
      }
      objects: {
        Row: {
          ai_summary: string | null
          category: string | null
          cooling_sources: Json
          created_at: string
          description: string | null
          frozen: boolean
          heat_sources: Json
          hidden: boolean
          id: string
          is_public_preview: boolean
          last_cooled_at: string | null
          merged_into: string | null
          name: string
          observation_count: number
          status: Database["public"]["Enums"]["object_status"]
          temperature: number
          top_tags: Json
          type: Database["public"]["Enums"]["object_type"]
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          category?: string | null
          cooling_sources?: Json
          created_at?: string
          description?: string | null
          frozen?: boolean
          heat_sources?: Json
          hidden?: boolean
          id?: string
          is_public_preview?: boolean
          last_cooled_at?: string | null
          merged_into?: string | null
          name: string
          observation_count?: number
          status?: Database["public"]["Enums"]["object_status"]
          temperature?: number
          top_tags?: Json
          type: Database["public"]["Enums"]["object_type"]
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          category?: string | null
          cooling_sources?: Json
          created_at?: string
          description?: string | null
          frozen?: boolean
          heat_sources?: Json
          hidden?: boolean
          id?: string
          is_public_preview?: boolean
          last_cooled_at?: string | null
          merged_into?: string | null
          name?: string
          observation_count?: number
          status?: Database["public"]["Enums"]["object_status"]
          temperature?: number
          top_tags?: Json
          type?: Database["public"]["Enums"]["object_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objects_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
        ]
      }
      observation_digests: {
        Row: {
          created_at: string
          id: string
          payload: Json
          period: string
          period_end: string
          period_start: string
          summary: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          period: string
          period_end: string
          period_start: string
          summary?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          period?: string
          period_end?: string
          period_start?: string
          summary?: string | null
        }
        Relationships: []
      }
      observations: {
        Row: {
          admin_note: string | null
          archive_category: string | null
          case_code: string | null
          cases_cited: Json
          cleaned_content: string | null
          confidence: number
          content: string
          created_at: string
          duplicate_of: string | null
          evidence_level: Database["public"]["Enums"]["evidence_level"] | null
          explanation: string | null
          facts: Json
          id: string
          impact_score: number
          object_id: string
          principles_matched: Json
          reference_url: string | null
          rejection_reason:
            | Database["public"]["Enums"]["rejection_reason"]
            | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          risk_reasons: Json
          scene: string | null
          screenshot_url: string | null
          similarity_score: number | null
          source_status: string | null
          status: Database["public"]["Enums"]["observation_status"]
          summary: string | null
          tags: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          archive_category?: string | null
          case_code?: string | null
          cases_cited?: Json
          cleaned_content?: string | null
          confidence?: number
          content: string
          created_at?: string
          duplicate_of?: string | null
          evidence_level?: Database["public"]["Enums"]["evidence_level"] | null
          explanation?: string | null
          facts?: Json
          id?: string
          impact_score?: number
          object_id: string
          principles_matched?: Json
          reference_url?: string | null
          rejection_reason?:
            | Database["public"]["Enums"]["rejection_reason"]
            | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_reasons?: Json
          scene?: string | null
          screenshot_url?: string | null
          similarity_score?: number | null
          source_status?: string | null
          status?: Database["public"]["Enums"]["observation_status"]
          summary?: string | null
          tags?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          archive_category?: string | null
          case_code?: string | null
          cases_cited?: Json
          cleaned_content?: string | null
          confidence?: number
          content?: string
          created_at?: string
          duplicate_of?: string | null
          evidence_level?: Database["public"]["Enums"]["evidence_level"] | null
          explanation?: string | null
          facts?: Json
          id?: string
          impact_score?: number
          object_id?: string
          principles_matched?: Json
          reference_url?: string | null
          rejection_reason?:
            | Database["public"]["Enums"]["rejection_reason"]
            | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_reasons?: Json
          scene?: string | null
          screenshot_url?: string | null
          similarity_score?: number | null
          source_status?: string | null
          status?: Database["public"]["Enums"]["observation_status"]
          summary?: string | null
          tags?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "observations_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
        ]
      }
      presence_sessions: {
        Row: {
          created_at: string
          last_seen_at: string
          last_seen_date: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          last_seen_at?: string
          last_seen_date?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          last_seen_at?: string
          last_seen_date?: string
          visitor_id?: string
        }
        Relationships: []
      }
      principles: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auto_approve: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          reputation: number
        }
        Insert: {
          auto_approve?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          reputation?: number
        }
        Update: {
          auto_approve?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          reputation?: number
        }
        Relationships: []
      }
      reputation_events: {
        Row: {
          created_at: string
          delta: number
          id: string
          observation_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          observation_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          observation_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      temperature_events: {
        Row: {
          actor_id: string | null
          breakdown: Json
          created_at: string
          delta: number
          id: string
          note: string | null
          object_id: string
          observation_id: string | null
          reason: string
          temperature_after: number
        }
        Insert: {
          actor_id?: string | null
          breakdown?: Json
          created_at?: string
          delta?: number
          id?: string
          note?: string | null
          object_id: string
          observation_id?: string | null
          reason: string
          temperature_after: number
        }
        Update: {
          actor_id?: string | null
          breakdown?: Json
          created_at?: string
          delta?: number
          id?: string
          note?: string | null
          object_id?: string
          observation_id?: string | null
          reason?: string
          temperature_after?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          object_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          object_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          object_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      observations_public: {
        Row: {
          archive_category: string | null
          case_code: string | null
          cases_cited: Json | null
          cleaned_content: string | null
          content: string | null
          created_at: string | null
          evidence_level: Database["public"]["Enums"]["evidence_level"] | null
          facts: Json | null
          id: string | null
          impact_score: number | null
          object_id: string | null
          reference_url: string | null
          scene: string | null
          screenshot_url: string | null
          status: Database["public"]["Enums"]["observation_status"] | null
          summary: string | null
          tags: Json | null
          updated_at: string | null
        }
        Insert: {
          archive_category?: string | null
          case_code?: string | null
          cases_cited?: Json | null
          cleaned_content?: string | null
          content?: string | null
          created_at?: string | null
          evidence_level?: Database["public"]["Enums"]["evidence_level"] | null
          facts?: Json | null
          id?: string | null
          impact_score?: number | null
          object_id?: string | null
          reference_url?: string | null
          scene?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["observation_status"] | null
          summary?: string | null
          tags?: Json | null
          updated_at?: string | null
        }
        Update: {
          archive_category?: string | null
          case_code?: string | null
          cases_cited?: Json | null
          cleaned_content?: string | null
          content?: string | null
          created_at?: string | null
          evidence_level?: Database["public"]["Enums"]["evidence_level"] | null
          facts?: Json | null
          id?: string | null
          impact_score?: number | null
          object_id?: string | null
          reference_url?: string | null
          scene?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["observation_status"] | null
          summary?: string | null
          tags?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "observations_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_reputation_delta: {
        Args: { _delta: number; _obs: string; _reason: string; _user: string }
        Returns: number
      }
      check_user_submit_limit: {
        Args: { _object: string; _user: string }
        Returns: Json
      }
      derive_archive_category: { Args: { _type: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      case_polarity: "positive" | "negative" | "controversial"
      case_status: "draft" | "published" | "archived"
      evidence_level: "A" | "B" | "C" | "D"
      object_status: "published" | "draft"
      object_type:
        | "brand"
        | "product"
        | "service"
        | "organization"
        | "film"
        | "game"
        | "show"
        | "event"
      observation_status:
        | "pending"
        | "approved"
        | "rejected"
        | "draft"
        | "archived"
      rejection_reason:
        | "too_short"
        | "no_facts"
        | "pure_emotion"
        | "duplicate"
        | "advertisement"
        | "personal_attack"
        | "defamation"
        | "off_topic"
      request_status: "pending" | "approved" | "rejected"
      risk_level: "low" | "medium" | "high"
      tag_polarity: "negative" | "positive"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      case_polarity: ["positive", "negative", "controversial"],
      case_status: ["draft", "published", "archived"],
      evidence_level: ["A", "B", "C", "D"],
      object_status: ["published", "draft"],
      object_type: [
        "brand",
        "product",
        "service",
        "organization",
        "film",
        "game",
        "show",
        "event",
      ],
      observation_status: [
        "pending",
        "approved",
        "rejected",
        "draft",
        "archived",
      ],
      rejection_reason: [
        "too_short",
        "no_facts",
        "pure_emotion",
        "duplicate",
        "advertisement",
        "personal_attack",
        "defamation",
        "off_topic",
      ],
      request_status: ["pending", "approved", "rejected"],
      risk_level: ["low", "medium", "high"],
      tag_polarity: ["negative", "positive"],
    },
  },
} as const
