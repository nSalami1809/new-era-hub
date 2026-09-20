// Hand-written to match supabase/migrations/*.sql — no live DB connection was
// available to run `supabase gen types typescript`. Regenerate with that
// command once the CLI is linked, and diff against this file.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          brand: string
          description: string
          price: number
          promotional_price: number | null
          stock: number
          low_stock_threshold: number
          sold: number
          sku: string
          images: string[]
          is_active: boolean
          is_featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          brand: string
          description?: string
          price: number
          promotional_price?: number | null
          stock?: number
          low_stock_threshold?: number
          sold?: number
          sku: string
          images: string[]
          is_active?: boolean
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          brand?: string
          description?: string
          price?: number
          promotional_price?: number | null
          stock?: number
          low_stock_threshold?: number
          sold?: number
          sku?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          id: number
          store_name: string
          logo_text: string
          logo_url: string | null
          whatsapp_number: string
          currency: string
          email: string | null
          phone: string | null
          address: string | null
          instagram: string | null
          facebook: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          store_name?: string
          logo_text?: string
          logo_url?: string | null
          whatsapp_number?: string
          currency?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          instagram?: string | null
          facebook?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          store_name?: string
          logo_text?: string
          logo_url?: string | null
          whatsapp_number?: string
          currency?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          instagram?: string | null
          facebook?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_first_name: string
          customer_last_name: string
          customer_phone: string
          delivery_location: string
          customer_address: string | null
          customer_note: string | null
          subtotal: number
          discount: number
          total: number
          status: Database["public"]["Enums"]["order_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          customer_first_name: string
          customer_last_name: string
          customer_phone: string
          delivery_location: string
          customer_address?: string | null
          customer_note?: string | null
          subtotal: number
          discount?: number
          total: number
          status?: Database["public"]["Enums"]["order_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          customer_first_name?: string
          customer_last_name?: string
          customer_phone?: string
          delivery_location?: string
          customer_address?: string | null
          customer_note?: string | null
          subtotal?: number
          discount?: number
          total?: number
          status?: Database["public"]["Enums"]["order_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          name: string
          brand: string
          sku: string
          image: string | null
          unit_price: number
          base_price: number
          quantity: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          name: string
          brand: string
          sku: string
          image?: string | null
          unit_price: number
          base_price: number
          quantity: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          name?: string
          brand?: string
          sku?: string
          image?: string | null
          unit_price?: number
          base_price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          id: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
          at: string
        }
        Insert: {
          id?: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
          at?: string
        }
        Update: {
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string | null
          product_name: string
          previous_stock: number
          new_stock: number
          difference: number
          reason: string
          admin_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          product_name: string
          previous_stock: number
          new_stock: number
          difference: number
          reason: string
          admin_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          product_name?: string
          previous_stock?: number
          new_stock?: number
          difference?: number
          reason?: string
          admin_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      create_order: {
        Args: {
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_delivery_location: string
          p_address: string
          p_note: string
          p_items: Json
        }
        Returns: { order_id: string; order_number: string }[]
      }
      get_order_receipt: {
        Args: { p_ref: string }
        Returns: Json
      }
      adjust_stock: {
        Args: { p_product_id: string; p_new_stock: number; p_reason: string }
        Returns: undefined
      }
    }
    Enums: {
      order_status:
        | "Nouvelle"
        | "Contacté"
        | "Paiement en attente"
        | "Payée"
        | "En préparation"
        | "Expédiée"
        | "Livrée"
        | "Annulée"
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
    },
  },
} as const
