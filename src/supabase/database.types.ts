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
      achievements: {
        Row: {
          created_at: string
          description: string
          gold_reward: number
          icon_family: string
          icon_name: string
          id: string
          key: string
          name: string
          requirement_type: string
          requirement_value: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          description: string
          gold_reward?: number
          icon_family: string
          icon_name: string
          id?: string
          key: string
          name: string
          requirement_type: string
          requirement_value: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string
          gold_reward?: number
          icon_family?: string
          icon_name?: string
          id?: string
          key?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          sort_order?: number
        }
        Relationships: []
      }
      battles: {
        Row: {
          created_at: string
          enemy_species_id: string
          id: string
          player_id: string
          reward: Json
          winner: string
          wobblin_id: string
        }
        Insert: {
          created_at?: string
          enemy_species_id: string
          id?: string
          player_id: string
          reward?: Json
          winner: string
          wobblin_id: string
        }
        Update: {
          created_at?: string
          enemy_species_id?: string
          id?: string
          player_id?: string
          reward?: Json
          winner?: string
          wobblin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battles_enemy_species_id_fkey"
            columns: ["enemy_species_id"]
            isOneToOne: false
            referencedRelation: "wobblin_species"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_wobblin_id_fkey"
            columns: ["wobblin_id"]
            isOneToOne: false
            referencedRelation: "player_wobblins"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          energy_cost: number
          id: string
          name: string
        }
        Insert: {
          energy_cost: number
          id?: string
          name: string
        }
        Update: {
          energy_cost?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      player_achievements: {
        Row: {
          achievement_id: string
          id: string
          player_id: string
          unlocked_at: string
        }
        Insert: {
          achievement_id: string
          id?: string
          player_id: string
          unlocked_at?: string
        }
        Update: {
          achievement_id?: string
          id?: string
          player_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_achievements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_wobblins: {
        Row: {
          attack: number
          created_at: string
          defense: number
          experience: number
          hp: number
          id: string
          level: number
          nickname: string | null
          player_id: string
          species_id: string
          speed: number
          training_points: number
        }
        Insert: {
          attack: number
          created_at?: string
          defense: number
          experience?: number
          hp: number
          id?: string
          level?: number
          nickname?: string | null
          player_id: string
          species_id: string
          speed: number
          training_points?: number
        }
        Update: {
          attack?: number
          created_at?: string
          defense?: number
          experience?: number
          hp?: number
          id?: string
          level?: number
          nickname?: string | null
          player_id?: string
          species_id?: string
          speed?: number
          training_points?: number
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
          energy: number
          energy_updated_at: string
          experience: number
          gold: number
          id: string
          last_claim_date: string | null
          level: number
          login_streak: number
          onboarding_completed: boolean
          username: string
        }
        Insert: {
          active_wobblin_id?: string | null
          avatar?: string | null
          created_at?: string
          energy?: number
          energy_updated_at?: string
          experience?: number
          gold?: number
          id: string
          last_claim_date?: string | null
          level?: number
          login_streak?: number
          onboarding_completed?: boolean
          username: string
        }
        Update: {
          active_wobblin_id?: string | null
          avatar?: string | null
          created_at?: string
          energy?: number
          energy_updated_at?: string
          experience?: number
          gold?: number
          id?: string
          last_claim_date?: string | null
          level?: number
          login_streak?: number
          onboarding_completed?: boolean
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
      wobblin_species: {
        Row: {
          base_attack: number
          base_defense: number
          base_hp: number
          base_speed: number
          description: string
          element: string
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
          element: string
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
          element?: string
          evolution_level?: number | null
          evolves_into_id?: string | null
          id?: string
          name?: string
          rarity?: string
          stage?: number
        }
        Relationships: [
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
      add_player_xp: {
        Args: { p_player_id: string; p_xp: number }
        Returns: {
          active_wobblin_id: string | null
          avatar: string | null
          created_at: string
          energy: number
          energy_updated_at: string
          experience: number
          gold: number
          id: string
          last_claim_date: string | null
          level: number
          login_streak: number
          onboarding_completed: boolean
          username: string
        }
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_wobblin_xp: {
        Args: { p_player_wobblin_id: string; p_xp: number }
        Returns: {
          attack: number
          created_at: string
          defense: number
          experience: number
          hp: number
          id: string
          level: number
          nickname: string | null
          player_id: string
          species_id: string
          speed: number
          training_points: number
        }
        SetofOptions: {
          from: "*"
          to: "player_wobblins"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      attempt_capture: { Args: { p_species_name: string }; Returns: Json }
      capture_wobblin: {
        Args: { p_species_id: string }
        Returns: {
          attack: number
          created_at: string
          defense: number
          experience: number
          hp: number
          id: string
          level: number
          nickname: string | null
          player_id: string
          species_id: string
          speed: number
          training_points: number
        }
        SetofOptions: {
          from: "*"
          to: "player_wobblins"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_achievements: { Args: never; Returns: Json }
      claim_daily_reward: { Args: never; Returns: Json }
      evolve_wobblin: { Args: { p_player_wobblin_id: string }; Returns: Json }
      regen_player_energy: {
        Args: { p_player_id: string }
        Returns: {
          active_wobblin_id: string | null
          avatar: string | null
          created_at: string
          energy: number
          energy_updated_at: string
          experience: number
          gold: number
          id: string
          last_claim_date: string | null
          level: number
          login_streak: number
          onboarding_completed: boolean
          username: string
        }
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_battle: { Args: { p_wobblin_id: string }; Returns: Json }
      spend_energy: {
        Args: { p_location_id: string }
        Returns: {
          active_wobblin_id: string | null
          avatar: string | null
          created_at: string
          energy: number
          energy_updated_at: string
          experience: number
          gold: number
          id: string
          last_claim_date: string | null
          level: number
          login_streak: number
          onboarding_completed: boolean
          username: string
        }
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_player_energy: {
        Args: never
        Returns: {
          active_wobblin_id: string | null
          avatar: string | null
          created_at: string
          energy: number
          energy_updated_at: string
          experience: number
          gold: number
          id: string
          last_claim_date: string | null
          level: number
          login_streak: number
          onboarding_completed: boolean
          username: string
        }
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      train_wobblin: {
        Args: { p_player_wobblin_id: string; p_training_option: string }
        Returns: {
          attack: number
          created_at: string
          defense: number
          experience: number
          hp: number
          id: string
          level: number
          nickname: string | null
          player_id: string
          species_id: string
          speed: number
          training_points: number
        }
        SetofOptions: {
          from: "*"
          to: "player_wobblins"
          isOneToOne: true
          isSetofReturn: false
        }
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
