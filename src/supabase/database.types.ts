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
      eggs: {
        Row: {
          claimed_at: string
          hatched_at: string | null
          id: string
          owner_id: string
          source_wobblin_id: string | null
          species_id: string
        }
        Insert: {
          claimed_at?: string
          hatched_at?: string | null
          id?: string
          owner_id: string
          source_wobblin_id?: string | null
          species_id: string
        }
        Update: {
          claimed_at?: string
          hatched_at?: string | null
          id?: string
          owner_id?: string
          source_wobblin_id?: string | null
          species_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eggs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eggs_source_wobblin_id_fkey"
            columns: ["source_wobblin_id"]
            isOneToOne: false
            referencedRelation: "player_wobblins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eggs_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "wobblin_species"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          player_id: string
          role: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          player_id: string
          role: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          player_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          is_public: boolean
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          is_public?: boolean
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          is_public?: boolean
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_wobblins: {
        Row: {
          acquired_at: string
          created_at: string
          experience: number
          id: string
          last_egg_claimed_at: string | null
          level: number
          locked_reason: string | null
          nickname: string | null
          player_id: string
          species_id: string
        }
        Insert: {
          acquired_at?: string
          created_at?: string
          experience?: number
          id?: string
          last_egg_claimed_at?: string | null
          level?: number
          locked_reason?: string | null
          nickname?: string | null
          player_id: string
          species_id: string
        }
        Update: {
          acquired_at?: string
          created_at?: string
          experience?: number
          id?: string
          last_egg_claimed_at?: string | null
          level?: number
          locked_reason?: string | null
          nickname?: string | null
          player_id?: string
          species_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_wobblins_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_wobblins_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "wobblin_species"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          active_wobblin_id: string | null
          avatar: string | null
          created_at: string
          disputes_filed_count: number
          disputes_received_count: number
          id: string
          onboarding_completed: boolean
          tasks_approved_count: number
          tasks_rejected_count: number
          username: string
        }
        Insert: {
          active_wobblin_id?: string | null
          avatar?: string | null
          created_at?: string
          disputes_filed_count?: number
          disputes_received_count?: number
          id: string
          onboarding_completed?: boolean
          tasks_approved_count?: number
          tasks_rejected_count?: number
          username: string
        }
        Update: {
          active_wobblin_id?: string | null
          avatar?: string | null
          created_at?: string
          disputes_filed_count?: number
          disputes_received_count?: number
          id?: string
          onboarding_completed?: boolean
          tasks_approved_count?: number
          tasks_rejected_count?: number
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_active_wobblin_id_fkey"
            columns: ["active_wobblin_id"]
            isOneToOne: false
            referencedRelation: "player_wobblins"
            referencedColumns: ["id"]
          },
        ]
      }
      task_applications: {
        Row: {
          applicant_id: string
          applied_at: string
          id: string
          task_id: string
        }
        Insert: {
          applicant_id: string
          applied_at?: string
          id?: string
          task_id: string
        }
        Update: {
          applicant_id?: string
          applied_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_applications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          creator_id: string
          description: string
          dispute_note: string | null
          disputed_at: string | null
          expires_at: string | null
          group_id: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          reward_wobblin_id: string
          status: string
          submission_note: string | null
          submission_photo_path: string | null
          submitted_at: string | null
          title: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          creator_id: string
          description?: string
          dispute_note?: string | null
          disputed_at?: string | null
          expires_at?: string | null
          group_id: string
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          reward_wobblin_id: string
          status?: string
          submission_note?: string | null
          submission_photo_path?: string | null
          submitted_at?: string | null
          title: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          creator_id?: string
          description?: string
          dispute_note?: string | null
          disputed_at?: string | null
          expires_at?: string | null
          group_id?: string
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          reward_wobblin_id?: string
          status?: string
          submission_note?: string | null
          submission_photo_path?: string | null
          submitted_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reward_wobblin_id_fkey"
            columns: ["reward_wobblin_id"]
            isOneToOne: false
            referencedRelation: "player_wobblins"
            referencedColumns: ["id"]
          },
        ]
      }
      wobblin_species: {
        Row: {
          base_attack: number
          base_defense: number
          base_hp: number
          base_speed: number
          description: string
          egg_cadence_hours: number | null
          element: string
          evolution_chain_id: string
          evolution_level: number | null
          evolves_into_id: string | null
          id: string
          name: string
          rarity: string
          stage: number
        }
        Insert: {
          base_attack: number
          base_defense: number
          base_hp: number
          base_speed: number
          description: string
          egg_cadence_hours?: number | null
          element: string
          evolution_chain_id: string
          evolution_level?: number | null
          evolves_into_id?: string | null
          id?: string
          name: string
          rarity: string
          stage?: number
        }
        Update: {
          base_attack?: number
          base_defense?: number
          base_hp?: number
          base_speed?: number
          description?: string
          egg_cadence_hours?: number | null
          element?: string
          evolution_chain_id?: string
          evolution_level?: number | null
          evolves_into_id?: string | null
          id?: string
          name?: string
          rarity?: string
          stage?: number
        }
        Relationships: [
          {
            foreignKeyName: "wobblin_species_evolution_chain_id_fkey"
            columns: ["evolution_chain_id"]
            isOneToOne: false
            referencedRelation: "wobblin_species"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wobblin_species_evolves_into_id_fkey"
            columns: ["evolves_into_id"]
            isOneToOne: false
            referencedRelation: "wobblin_species"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_task: {
        Args: { p_task_id: string }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          creator_id: string
          description: string
          dispute_note: string | null
          disputed_at: string | null
          expires_at: string | null
          group_id: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          reward_wobblin_id: string
          status: string
          submission_note: string | null
          submission_photo_path: string | null
          submitted_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_wobblin_xp: {
        Args: { p_player_wobblin_id: string; p_xp: number }
        Returns: {
          acquired_at: string
          created_at: string
          experience: number
          id: string
          last_egg_claimed_at: string | null
          level: number
          locked_reason: string | null
          nickname: string | null
          player_id: string
          species_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_wobblins"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_task: {
        Args: { p_task_id: string }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          creator_id: string
          description: string
          dispute_note: string | null
          disputed_at: string | null
          expires_at: string | null
          group_id: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          reward_wobblin_id: string
          status: string
          submission_note: string | null
          submission_photo_path: string | null
          submitted_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_egg: { Args: { p_player_wobblin_id: string }; Returns: Json }
      create_group: {
        Args: { p_is_public?: boolean; p_name: string }
        Returns: {
          created_at: string
          id: string
          invite_code: string
          is_public: boolean
          name: string
          owner_id: string
        }
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_task: {
        Args: {
          p_description: string
          p_expires_at?: string
          p_group_id: string
          p_reward_wobblin_id: string
          p_title: string
        }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          creator_id: string
          description: string
          dispute_note: string | null
          disputed_at: string | null
          expires_at: string | null
          group_id: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          reward_wobblin_id: string
          status: string
          submission_note: string | null
          submission_photo_path: string | null
          submitted_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      evolve_wobblin: { Args: { p_player_wobblin_id: string }; Returns: Json }
      expire_task: {
        Args: { p_task_id: string }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          creator_id: string
          description: string
          dispute_note: string | null
          disputed_at: string | null
          expires_at: string | null
          group_id: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          reward_wobblin_id: string
          status: string
          submission_note: string | null
          submission_photo_path: string | null
          submitted_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      file_dispute: {
        Args: { p_reason: string; p_task_id: string }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          creator_id: string
          description: string
          dispute_note: string | null
          disputed_at: string | null
          expires_at: string | null
          group_id: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          reward_wobblin_id: string
          status: string
          submission_note: string | null
          submission_photo_path: string | null
          submitted_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      hatch_egg: {
        Args: { p_egg_id: string }
        Returns: {
          acquired_at: string
          created_at: string
          experience: number
          id: string
          last_egg_claimed_at: string | null
          level: number
          locked_reason: string | null
          nickname: string | null
          player_id: string
          species_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_wobblins"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_group_member: { Args: { p_group_id: string }; Returns: boolean }
      join_group: {
        Args: { p_invite_code: string }
        Returns: {
          created_at: string
          id: string
          invite_code: string
          is_public: boolean
          name: string
          owner_id: string
        }
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      join_public_group: {
        Args: { p_group_id: string }
        Returns: {
          created_at: string
          id: string
          invite_code: string
          is_public: boolean
          name: string
          owner_id: string
        }
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_public_groups: {
        Args: never
        Returns: {
          created_at: string
          id: string
          invite_code: string
          member_count: number
          name: string
          open_task_count: number
        }[]
      }
      request_task: {
        Args: { p_task_id: string }
        Returns: {
          applicant_id: string
          applied_at: string
          id: string
          task_id: string
        }
        SetofOptions: {
          from: "*"
          to: "task_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_task: {
        Args: {
          p_approve: boolean
          p_resolution_note: string
          p_task_id: string
        }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          creator_id: string
          description: string
          dispute_note: string | null
          disputed_at: string | null
          expires_at: string | null
          group_id: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          reward_wobblin_id: string
          status: string
          submission_note: string | null
          submission_photo_path: string | null
          submitted_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sacrifice_wobblin: {
        Args: { p_consumed_wobblin_id: string; p_target_wobblin_id: string }
        Returns: Json
      }
      select_applicant: {
        Args: { p_applicant_id: string; p_task_id: string }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          creator_id: string
          description: string
          dispute_note: string | null
          disputed_at: string | null
          expires_at: string | null
          group_id: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          reward_wobblin_id: string
          status: string
          submission_note: string | null
          submission_photo_path: string | null
          submitted_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_task: {
        Args: {
          p_submission_note: string
          p_submission_photo_path?: string
          p_task_id: string
        }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          creator_id: string
          description: string
          dispute_note: string | null
          disputed_at: string | null
          expires_at: string | null
          group_id: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          reward_wobblin_id: string
          status: string
          submission_note: string | null
          submission_photo_path: string | null
          submitted_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      withdraw_task_application: {
        Args: { p_task_id: string }
        Returns: undefined
      }
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
    Enums: {},
  },
} as const
