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
          created_at: string
          description: string | null
          id: string
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
          created_at?: string
          description?: string | null
          id?: string
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
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          observation_count?: number
          status?: Database["public"]["Enums"]["object_status"]
          temperature?: number
          top_tags?: Json
          type?: Database["public"]["Enums"]["object_type"]
          updated_at?: string
        }
        Relationships: []
      }
      observations: {
        Row: {
          admin_note: string | null
          cleaned_content: string | null
          content: string
          created_at: string
          evidence_level: Database["public"]["Enums"]["evidence_level"] | null
          id: string
          object_id: string
          reference_url: string | null
          scene: string | null
          screenshot_url: string | null
          status: Database["public"]["Enums"]["observation_status"]
          tags: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          cleaned_content?: string | null
          content: string
          created_at?: string
          evidence_level?: Database["public"]["Enums"]["evidence_level"] | null
          id?: string
          object_id: string
          reference_url?: string | null
          scene?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["observation_status"]
          tags?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          cleaned_content?: string | null
          content?: string
          created_at?: string
          evidence_level?: Database["public"]["Enums"]["evidence_level"] | null
          id?: string
          object_id?: string
          reference_url?: string | null
          scene?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["observation_status"]
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
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      observation_status: "pending" | "approved" | "rejected"
      request_status: "pending" | "approved" | "rejected"
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
      observation_status: ["pending", "approved", "rejected"],
      request_status: ["pending", "approved", "rejected"],
    },
  },
} as const
