// Generated from the live Supabase project (lrwirmjzojvocgfvolqb) to match
// supabase/migrations/*.sql. Regenerate with `supabase gen types typescript`
// after adding a migration, and diff against this file.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      order_items: {
        Row: {
          base_price: number;
          brand: string;
          cost_price: number;
          id: string;
          image: string | null;
          name: string;
          order_id: string;
          product_id: string | null;
          quantity: number;
          sku: string;
          unit_price: number;
          variant_id: string | null;
          variant_size: string | null;
        };
        Insert: {
          base_price: number;
          brand: string;
          cost_price?: number;
          id?: string;
          image?: string | null;
          name: string;
          order_id: string;
          product_id?: string | null;
          quantity: number;
          sku: string;
          unit_price: number;
          variant_id?: string | null;
          variant_size?: string | null;
        };
        Update: {
          base_price?: number;
          brand?: string;
          cost_price?: number;
          id?: string;
          image?: string | null;
          name?: string;
          order_id?: string;
          product_id?: string | null;
          quantity?: number;
          sku?: string;
          unit_price?: number;
          variant_id?: string | null;
          variant_size?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          at: string;
          id: string;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
        };
        Insert: {
          at?: string;
          id?: string;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
        };
        Update: {
          at?: string;
          id?: string;
          order_id?: string;
          status?: Database["public"]["Enums"]["order_status"];
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string;
          customer_address: string | null;
          customer_first_name: string;
          customer_last_name: string;
          customer_note: string | null;
          customer_phone: string;
          delivery_location: string;
          discount: number;
          id: string;
          order_number: string;
          promo_code: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_address?: string | null;
          customer_first_name: string;
          customer_last_name: string;
          customer_note?: string | null;
          customer_phone: string;
          delivery_location: string;
          discount?: number;
          id?: string;
          order_number: string;
          promo_code?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_address?: string | null;
          customer_first_name?: string;
          customer_last_name?: string;
          customer_note?: string | null;
          customer_phone?: string;
          delivery_location?: string;
          discount?: number;
          id?: string;
          order_number?: string;
          promo_code?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_variants: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          size: string;
          stock: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          size: string;
          stock?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          size?: string;
          stock?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_reviews: {
        Row: {
          author_name: string;
          comment: string;
          created_at: string;
          id: string;
          is_approved: boolean;
          product_id: string;
          rating: number;
        };
        Insert: {
          author_name: string;
          comment?: string;
          created_at?: string;
          id?: string;
          is_approved?: boolean;
          product_id: string;
          rating: number;
        };
        Update: {
          author_name?: string;
          comment?: string;
          created_at?: string;
          id?: string;
          is_approved?: boolean;
          product_id?: string;
          rating?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          brand: string;
          bundle_active: boolean;
          bundle_price: number | null;
          bundle_quantity: number | null;
          category: Database["public"]["Enums"]["product_category"];
          cost_price: number;
          created_at: string;
          description: string;
          id: string;
          images: string[];
          is_active: boolean;
          is_featured: boolean;
          low_stock_threshold: number;
          name: string;
          price: number;
          promotional_price: number | null;
          sku: string;
          sold: number;
          stock: number;
          updated_at: string;
        };
        Insert: {
          brand: string;
          bundle_active?: boolean;
          bundle_price?: number | null;
          bundle_quantity?: number | null;
          category?: Database["public"]["Enums"]["product_category"];
          cost_price?: number;
          created_at?: string;
          description?: string;
          id?: string;
          images?: string[];
          is_active?: boolean;
          is_featured?: boolean;
          low_stock_threshold?: number;
          name: string;
          price: number;
          promotional_price?: number | null;
          sku: string;
          sold?: number;
          stock?: number;
          updated_at?: string;
        };
        Update: {
          brand?: string;
          bundle_active?: boolean;
          bundle_price?: number | null;
          bundle_quantity?: number | null;
          category?: Database["public"]["Enums"]["product_category"];
          cost_price?: number;
          created_at?: string;
          description?: string;
          id?: string;
          images?: string[];
          is_active?: boolean;
          is_featured?: boolean;
          low_stock_threshold?: number;
          name?: string;
          price?: number;
          promotional_price?: number | null;
          sku?: string;
          sold?: number;
          stock?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      promo_codes: {
        Row: {
          code: string;
          created_at: string;
          discount_type: string;
          discount_value: number;
          expires_at: string | null;
          id: string;
          is_active: boolean;
          max_uses: number | null;
          min_order_total: number | null;
          used_count: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          discount_type: string;
          discount_value: number;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
          min_order_total?: number | null;
          used_count?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          discount_type?: string;
          discount_value?: number;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
          min_order_total?: number | null;
          used_count?: number;
        };
        Relationships: [];
      };
      stock_alerts: {
        Row: {
          created_at: string;
          id: string;
          phone: string;
          product_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          phone: string;
          product_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          phone?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_alerts_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          admin_id: string | null;
          created_at: string;
          difference: number;
          id: string;
          new_stock: number;
          previous_stock: number;
          product_id: string | null;
          product_name: string;
          reason: string;
        };
        Insert: {
          admin_id?: string | null;
          created_at?: string;
          difference: number;
          id?: string;
          new_stock: number;
          previous_stock: number;
          product_id?: string | null;
          product_name: string;
          reason: string;
        };
        Update: {
          admin_id?: string | null;
          created_at?: string;
          difference?: number;
          id?: string;
          new_stock?: number;
          previous_stock?: number;
          product_id?: string | null;
          product_name?: string;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      store_settings: {
        Row: {
          address: string | null;
          currency: string;
          email: string | null;
          facebook: string | null;
          id: number;
          instagram: string | null;
          logo_text: string;
          logo_url: string | null;
          phone: string | null;
          store_name: string;
          updated_at: string;
          whatsapp_number: string;
        };
        Insert: {
          address?: string | null;
          currency?: string;
          email?: string | null;
          facebook?: string | null;
          id?: number;
          instagram?: string | null;
          logo_text?: string;
          logo_url?: string | null;
          phone?: string | null;
          store_name?: string;
          updated_at?: string;
          whatsapp_number?: string;
        };
        Update: {
          address?: string | null;
          currency?: string;
          email?: string | null;
          facebook?: string | null;
          id?: number;
          instagram?: string | null;
          logo_text?: string;
          logo_url?: string | null;
          phone?: string | null;
          store_name?: string;
          updated_at?: string;
          whatsapp_number?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_product_variant: {
        Args: { p_initial_stock: number; p_product_id: string; p_size: string };
        Returns: string;
      };
      adjust_stock: {
        Args: { p_new_stock: number; p_product_id: string; p_reason: string };
        Returns: undefined;
      };
      adjust_variant_stock: {
        Args: { p_new_stock: number; p_reason: string; p_variant_id: string };
        Returns: undefined;
      };
      create_order: {
        Args: {
          p_address: string;
          p_delivery_location: string;
          p_first_name: string;
          p_items: Json;
          p_last_name: string;
          p_note: string;
          p_phone: string;
          p_promo_code?: string;
        };
        Returns: {
          order_id: string;
          order_number: string;
        }[];
      };
      get_order_receipt: { Args: { p_ref: string }; Returns: Json };
      is_admin: { Args: never; Returns: boolean };
      preview_promo_code: {
        Args: { p_code: string; p_subtotal: number };
        Returns: Json;
      };
      remove_product_variant: {
        Args: { p_variant_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      order_status:
        | "Nouvelle"
        | "Contacté"
        | "Paiement en attente"
        | "Payée"
        | "En préparation"
        | "Expédiée"
        | "Livrée"
        | "Annulée";
      product_category: "Casquettes" | "Vêtements" | "Chaussures" | "Accessoires";
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      order_status: [
        "Nouvelle",
        "Contacté",
        "Paiement en attente",
        "Payée",
        "En préparation",
        "Expédiée",
        "Livrée",
        "Annulée",
      ],
      product_category: ["Casquettes", "Vêtements", "Chaussures", "Accessoires"],
    },
  },
} as const;
