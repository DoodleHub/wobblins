export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      battles: {
        Row: {
          created_at: string;
          enemy_species_id: string;
          id: string;
          player_id: string;
          reward: Json;
          winner: string;
          wobblin_id: string;
        };
        Insert: {
          created_at?: string;
          enemy_species_id: string;
          id?: string;
          player_id: string;
          reward?: Json;
          winner: string;
          wobblin_id: string;
        };
        Update: {
          created_at?: string;
          enemy_species_id?: string;
          id?: string;
          player_id?: string;
          reward?: Json;
          winner?: string;
          wobblin_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "battles_enemy_species_id_fkey";
            columns: ["enemy_species_id"];
            isOneToOne: false;
            referencedRelation: "wobblin_species";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "battles_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "battles_wobblin_id_fkey";
            columns: ["wobblin_id"];
            isOneToOne: false;
            referencedRelation: "player_wobblins";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          energy_cost: number;
          id: string;
          name: string;
        };
        Insert: {
          energy_cost: number;
          id?: string;
          name: string;
        };
        Update: {
          energy_cost?: number;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      player_wobblins: {
        Row: {
          attack: number;
          created_at: string;
          defense: number;
          experience: number;
          hp: number;
          id: string;
          level: number;
          nickname: string | null;
          player_id: string;
          species_id: string;
          speed: number;
          training_points: number;
        };
        Insert: {
          attack: number;
          created_at?: string;
          defense: number;
          experience?: number;
          hp: number;
          id?: string;
          level?: number;
          nickname?: string | null;
          player_id: string;
          species_id: string;
          speed: number;
          training_points?: number;
        };
        Update: {
          attack?: number;
          created_at?: string;
          defense?: number;
          experience?: number;
          hp?: number;
          id?: string;
          level?: number;
          nickname?: string | null;
          player_id?: string;
          species_id?: string;
          speed?: number;
          training_points?: number;
        };
        Relationships: [
          {
            foreignKeyName: "player_wobblins_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_wobblins_species_id_fkey";
            columns: ["species_id"];
            isOneToOne: false;
            referencedRelation: "wobblin_species";
            referencedColumns: ["id"];
          },
        ];
      };
      players: {
        Row: {
          created_at: string;
          energy: number;
          experience: number;
          gold: number;
          id: string;
          level: number;
          onboarding_completed: boolean;
          username: string;
        };
        Insert: {
          created_at?: string;
          energy?: number;
          experience?: number;
          gold?: number;
          id: string;
          level?: number;
          onboarding_completed?: boolean;
          username: string;
        };
        Update: {
          created_at?: string;
          energy?: number;
          experience?: number;
          gold?: number;
          id?: string;
          level?: number;
          onboarding_completed?: boolean;
          username?: string;
        };
        Relationships: [];
      };
      wobblin_species: {
        Row: {
          base_attack: number;
          base_defense: number;
          base_hp: number;
          base_speed: number;
          description: string;
          element: string;
          id: string;
          name: string;
          rarity: string;
        };
        Insert: {
          base_attack: number;
          base_defense: number;
          base_hp: number;
          base_speed: number;
          description: string;
          element: string;
          id?: string;
          name: string;
          rarity: string;
        };
        Update: {
          base_attack?: number;
          base_defense?: number;
          base_hp?: number;
          base_speed?: number;
          description?: string;
          element?: string;
          id?: string;
          name?: string;
          rarity?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      attempt_capture: { Args: { p_species_name: string }; Returns: Json };
      capture_wobblin: {
        Args: { p_species_id: string };
        Returns: {
          attack: number;
          created_at: string;
          defense: number;
          experience: number;
          hp: number;
          id: string;
          level: number;
          nickname: string | null;
          player_id: string;
          species_id: string;
          speed: number;
          training_points: number;
        };
        SetofOptions: {
          from: "*";
          to: "player_wobblins";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      resolve_battle: { Args: { p_wobblin_id: string }; Returns: Json };
      spend_energy: {
        Args: { p_location_id: string };
        Returns: {
          created_at: string;
          energy: number;
          experience: number;
          gold: number;
          id: string;
          level: number;
          onboarding_completed: boolean;
          username: string;
        };
        SetofOptions: {
          from: "*";
          to: "players";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      start_battle: {
        Args: { p_enemy_species_id: string; p_wobblin_id: string };
        Returns: Json;
      };
      train_wobblin: {
        Args: { p_player_wobblin_id: string; p_training_option: string };
        Returns: {
          attack: number;
          created_at: string;
          defense: number;
          experience: number;
          hp: number;
          id: string;
          level: number;
          nickname: string | null;
          player_id: string;
          species_id: string;
          speed: number;
          training_points: number;
        };
        SetofOptions: {
          from: "*";
          to: "player_wobblins";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
