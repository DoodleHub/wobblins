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
      achievement_definitions: {
        Row: {
          description: string
          id: string
          key: string
          metric: string
          name: string
          reward_essence: number
          sort_order: number
          target: number
          tier: string
        }
        Insert: {
          description: string
          id?: string
          key: string
          metric: string
          name: string
          reward_essence: number
          sort_order: number
          target: number
          tier: string
        }
        Update: {
          description?: string
          id?: string
          key?: string
          metric?: string
          name?: string
          reward_essence?: number
          sort_order?: number
          target?: number
          tier?: string
        }
        Relationships: []
      }
      eggs: {
        Row: {
          claimed_at: string
          hatched_at: string | null
          id: string
          owner_id: string
          source_wobblin_id: string | null
          species_id: string
          xp: number
        }
        Insert: {
          claimed_at?: string
          hatched_at?: string | null
          id?: string
          owner_id: string
          source_wobblin_id?: string | null
          species_id: string
          xp?: number
        }
        Update: {
          claimed_at?: string
          hatched_at?: string | null
          id?: string
          owner_id?: string
          source_wobblin_id?: string | null
          species_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "eggs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "player_public_profiles"
            referencedColumns: ["id"]
          },
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
      essence_config: {
        Row: {
          daily_claim_amount: number
          egg_hatch_xp_required: number
          id: boolean
          passive_accrual_cap_hours: number
          summon_cost_essence: number
          xp_per_essence: number
        }
        Insert: {
          daily_claim_amount?: number
          egg_hatch_xp_required?: number
          id?: boolean
          passive_accrual_cap_hours?: number
          summon_cost_essence?: number
          xp_per_essence?: number
        }
        Update: {
          daily_claim_amount?: number
          egg_hatch_xp_required?: number
          id?: boolean
          passive_accrual_cap_hours?: number
          summon_cost_essence?: number
          xp_per_essence?: number
        }
        Relationships: []
      }
      essence_generation_rates: {
        Row: {
          base_rate_per_hour: number
          per_level_rate: number
          stage: number
        }
        Insert: {
          base_rate_per_hour: number
          per_level_rate: number
          stage: number
        }
        Update: {
          base_rate_per_hour?: number
          per_level_rate?: number
          stage?: number
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          cancelled_at: string | null
          created_at: string
          id: string
          listing_type: string
          player_wobblin_id: string
          price_essence: number | null
          seller_id: string
          sold_at: string | null
          sold_to: string | null
          status: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          id?: string
          listing_type?: string
          player_wobblin_id: string
          price_essence?: number | null
          seller_id: string
          sold_at?: string | null
          sold_to?: string | null
          status?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          id?: string
          listing_type?: string
          player_wobblin_id?: string
          price_essence?: number | null
          seller_id?: string
          sold_at?: string | null
          sold_to?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_player_wobblin_id_fkey"
            columns: ["player_wobblin_id"]
            isOneToOne: false
            referencedRelation: "player_wobblins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "player_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_sold_to_fkey"
            columns: ["sold_to"]
            isOneToOne: false
            referencedRelation: "player_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_sold_to_fkey"
            columns: ["sold_to"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_offer_wobblins: {
        Row: {
          offer_id: string
          player_wobblin_id: string
        }
        Insert: {
          offer_id: string
          player_wobblin_id: string
        }
        Update: {
          offer_id?: string
          player_wobblin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_offer_wobblins_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "marketplace_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_offer_wobblins_player_wobblin_id_fkey"
            columns: ["player_wobblin_id"]
            isOneToOne: false
            referencedRelation: "player_wobblins"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_offers: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_offers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "player_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_offers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      player_achievement_claims: {
        Row: {
          achievement_id: string
          claimed_at: string
          player_id: string
        }
        Insert: {
          achievement_id: string
          claimed_at?: string
          player_id: string
        }
        Update: {
          achievement_id?: string
          claimed_at?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_achievement_claims_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_achievement_claims_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_achievement_claims_player_id_fkey"
            columns: ["player_id"]
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
          nickname?: string | null
          player_id?: string
          species_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_wobblins_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_public_profiles"
            referencedColumns: ["id"]
          },
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
          essence_balance: number
          essence_last_passive_claim_at: string | null
          id: string
          last_daily_essence_claim_date: string | null
          onboarding_completed: boolean
          total_eggs_hatched_count: number
          total_essence_earned: number
          total_evolutions_count: number
          total_marketplace_sales_count: number
          total_summons_count: number
          total_trades_completed_count: number
          username: string
        }
        Insert: {
          active_wobblin_id?: string | null
          avatar?: string | null
          created_at?: string
          essence_balance?: number
          essence_last_passive_claim_at?: string | null
          id: string
          last_daily_essence_claim_date?: string | null
          onboarding_completed?: boolean
          total_eggs_hatched_count?: number
          total_essence_earned?: number
          total_evolutions_count?: number
          total_marketplace_sales_count?: number
          total_summons_count?: number
          total_trades_completed_count?: number
          username: string
        }
        Update: {
          active_wobblin_id?: string | null
          avatar?: string | null
          created_at?: string
          essence_balance?: number
          essence_last_passive_claim_at?: string | null
          id?: string
          last_daily_essence_claim_date?: string | null
          onboarding_completed?: boolean
          total_eggs_hatched_count?: number
          total_essence_earned?: number
          total_evolutions_count?: number
          total_marketplace_sales_count?: number
          total_summons_count?: number
          total_trades_completed_count?: number
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
      wobblin_level_xp_requirements: {
        Row: {
          level: number
          xp_required: number
        }
        Insert: {
          level: number
          xp_required: number
        }
        Update: {
          level?: number
          xp_required?: number
        }
        Relationships: []
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
      player_public_profiles: {
        Row: {
          avatar: string | null
          created_at: string | null
          id: string | null
          username: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          id?: string | null
          username?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_wobblin_xp: {
        Args: { p_player_wobblin_id: string; p_xp: number }
        Returns: {
          acquired_at: string
          created_at: string
          experience: number
          id: string
          last_egg_claimed_at: string | null
          level: number
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
      buy_listed_wobblin: { Args: { p_listing_id: string }; Returns: Json }
      cancel_listing: { Args: { p_listing_id: string }; Returns: Json }
      cancel_wobblin_offer: { Args: { p_offer_id: string }; Returns: Json }
      claim_achievement_reward: {
        Args: { p_achievement_id: string }
        Returns: Json
      }
      claim_daily_essence: { Args: never; Returns: Json }
      claim_egg: { Args: { p_player_wobblin_id: string }; Returns: Json }
      claim_passive_essence: { Args: never; Returns: Json }
      evolve_wobblin: { Args: { p_player_wobblin_id: string }; Returns: Json }
      feed_egg_essence: {
        Args: { p_egg_id: string; p_essence_amount: number }
        Returns: Json
      }
      get_player_achievements: {
        Args: never
        Returns: {
          claimed: boolean
          current_value: number
          description: string
          id: string
          key: string
          metric: string
          name: string
          reward_essence: number
          sort_order: number
          target: number
          tier: string
          unlocked: boolean
        }[]
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
      list_wobblin_for_offers: {
        Args: { p_player_wobblin_id: string }
        Returns: Json
      }
      list_wobblin_for_sale: {
        Args: { p_player_wobblin_id: string; p_price_essence: number }
        Returns: Json
      }
      propose_wobblin_offer: {
        Args: { p_listing_id: string; p_offered_wobblin_ids: string[] }
        Returns: Json
      }
      respond_to_wobblin_offer: {
        Args: { p_accept: boolean; p_offer_id: string }
        Returns: Json
      }
      spend_essence_for_xp: {
        Args: { p_essence_amount: number; p_player_wobblin_id: string }
        Returns: Json
      }
      summon_wobblin: { Args: never; Returns: Json }
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
