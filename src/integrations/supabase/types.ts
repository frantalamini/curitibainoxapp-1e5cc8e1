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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      category_budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          month: number
          updated_at: string
          year: number
        }
        Insert: {
          amount?: number
          category_id: string
          created_at?: string
          id?: string
          month: number
          updated_at?: string
          year: number
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          month?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "category_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          items: Json
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          items?: Json
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          items?: Json
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          cep: string | null
          city: string | null
          client_number: number | null
          complement: string | null
          cpf_cnpj: string | null
          created_at: string
          created_by: string
          email: string | null
          full_name: string
          id: string
          neighborhood: string | null
          nome_fantasia: string | null
          notes: string | null
          number: string | null
          phone: string
          phone_2: string | null
          responsible_financial: Json | null
          responsible_legal: Json | null
          responsible_technical: Json | null
          secondary_name: string | null
          state: string | null
          state_registration: string | null
          street: string | null
          tipo: Database["public"]["Enums"]["cadastro_tipo"] | null
          tipos: Database["public"]["Enums"]["cadastro_tipo"][] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cep?: string | null
          city?: string | null
          client_number?: number | null
          complement?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          full_name: string
          id?: string
          neighborhood?: string | null
          nome_fantasia?: string | null
          notes?: string | null
          number?: string | null
          phone: string
          phone_2?: string | null
          responsible_financial?: Json | null
          responsible_legal?: Json | null
          responsible_technical?: Json | null
          secondary_name?: string | null
          state?: string | null
          state_registration?: string | null
          street?: string | null
          tipo?: Database["public"]["Enums"]["cadastro_tipo"] | null
          tipos?: Database["public"]["Enums"]["cadastro_tipo"][] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cep?: string | null
          city?: string | null
          client_number?: number | null
          complement?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          full_name?: string
          id?: string
          neighborhood?: string | null
          nome_fantasia?: string | null
          notes?: string | null
          number?: string | null
          phone?: string
          phone_2?: string | null
          responsible_financial?: Json | null
          responsible_legal?: Json | null
          responsible_technical?: Json | null
          secondary_name?: string | null
          state?: string | null
          state_registration?: string | null
          street?: string | null
          tipo?: Database["public"]["Enums"]["cadastro_tipo"] | null
          tipos?: Database["public"]["Enums"]["cadastro_tipo"][] | null
          updated_at?: string
        }
        Relationships: []
      }
      color_palettes: {
        Row: {
          cmyk_c: number
          cmyk_k: number
          cmyk_m: number
          cmyk_y: number
          created_at: string | null
          display_order: number | null
          hex: string
          hsl_h: number
          hsl_l: number
          hsl_s: number
          id: string
          is_active: boolean | null
          name: string
          rgb_b: number
          rgb_g: number
          rgb_r: number
          role: string
          updated_at: string | null
        }
        Insert: {
          cmyk_c: number
          cmyk_k: number
          cmyk_m: number
          cmyk_y: number
          created_at?: string | null
          display_order?: number | null
          hex: string
          hsl_h: number
          hsl_l: number
          hsl_s: number
          id?: string
          is_active?: boolean | null
          name: string
          rgb_b: number
          rgb_g: number
          rgb_r: number
          role: string
          updated_at?: string | null
        }
        Update: {
          cmyk_c?: number
          cmyk_k?: number
          cmyk_m?: number
          cmyk_y?: number
          created_at?: string | null
          display_order?: number | null
          hex?: string
          hsl_h?: number
          hsl_l?: number
          hsl_s?: number
          id?: string
          is_active?: boolean | null
          name?: string
          rgb_b?: number
          rgb_g?: number
          rgb_r?: number
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          card_brand: string | null
          closing_day: number
          created_at: string
          credit_limit: number | null
          due_day: number
          id: string
          is_active: boolean
          last_digits: string | null
          name: string
          updated_at: string
        }
        Insert: {
          card_brand?: string | null
          closing_day: number
          created_at?: string
          credit_limit?: number | null
          due_day: number
          id?: string
          is_active?: boolean
          last_digits?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          card_brand?: string | null
          closing_day?: number
          created_at?: string
          credit_limit?: number | null
          due_day?: number
          id?: string
          is_active?: boolean
          last_digits?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          brand: string
          client_id: string
          created_at: string
          id: string
          imei: string | null
          model: string
          notes: string | null
          serial_number: string | null
          updated_at: string
        }
        Insert: {
          brand: string
          client_id: string
          created_at?: string
          id?: string
          imei?: string | null
          model: string
          notes?: string | null
          serial_number?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string
          client_id?: string
          created_at?: string
          id?: string
          imei?: string | null
          model?: string
          notes?: string | null
          serial_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          agency: string | null
          bank_name: string | null
          created_at: string
          id: string
          is_active: boolean
          manager_name: string | null
          name: string
          opening_balance: number
          opening_balance_date: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          manager_name?: string | null
          name: string
          opening_balance?: number
          opening_balance_date?: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          manager_name?: string | null
          name?: string
          opening_balance?: number
          opening_balance_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_audit_log: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      financial_categories: {
        Row: {
          created_at: string
          dre_group: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dre_group?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dre_group?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          bank_statement_ref: string | null
          category_id: string | null
          client_id: string | null
          cost_center_id: string | null
          created_at: string | null
          credit_card_id: string | null
          credit_card_statement_date: string | null
          description: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          discount: number | null
          due_date: string
          financial_account_id: string | null
          id: string
          installment_number: number | null
          installments_group_id: string | null
          installments_total: number | null
          interest: number | null
          interval_days: number | null
          is_reconciled: boolean | null
          notes: string | null
          origin: Database["public"]["Enums"]["transaction_origin"]
          paid_at: string | null
          payment_method: string | null
          reconciled_at: string | null
          service_call_id: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
        }
        Insert: {
          amount: number
          bank_statement_ref?: string | null
          category_id?: string | null
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          credit_card_id?: string | null
          credit_card_statement_date?: string | null
          description?: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          discount?: number | null
          due_date: string
          financial_account_id?: string | null
          id?: string
          installment_number?: number | null
          installments_group_id?: string | null
          installments_total?: number | null
          interest?: number | null
          interval_days?: number | null
          is_reconciled?: boolean | null
          notes?: string | null
          origin: Database["public"]["Enums"]["transaction_origin"]
          paid_at?: string | null
          payment_method?: string | null
          reconciled_at?: string | null
          service_call_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
        }
        Update: {
          amount?: number
          bank_statement_ref?: string | null
          category_id?: string | null
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          credit_card_id?: string | null
          credit_card_statement_date?: string | null
          description?: string | null
          direction?: Database["public"]["Enums"]["transaction_direction"]
          discount?: number | null
          due_date?: string
          financial_account_id?: string | null
          id?: string
          installment_number?: number | null
          installments_group_id?: string | null
          installments_total?: number | null
          interest?: number | null
          interval_days?: number | null
          is_reconciled?: boolean | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["transaction_origin"]
          paid_at?: string | null
          payment_method?: string | null
          reconciled_at?: string | null
          service_call_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          link: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          title?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          brand: string | null
          cest: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          gtin: string | null
          height_cm: number | null
          id: string
          length_cm: number | null
          markup: number | null
          min_stock: number | null
          model: string | null
          name: string
          ncm: string | null
          origin: string | null
          sale_price: number | null
          sku: string | null
          tax_cofins: number | null
          tax_icms: number | null
          tax_pis: number | null
          track_stock: boolean | null
          type: string | null
          unit: string | null
          unit_price: number | null
          updated_at: string | null
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          active?: boolean | null
          brand?: string | null
          cest?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          gtin?: string | null
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          markup?: number | null
          min_stock?: number | null
          model?: string | null
          name: string
          ncm?: string | null
          origin?: string | null
          sale_price?: number | null
          sku?: string | null
          tax_cofins?: number | null
          tax_icms?: number | null
          tax_pis?: number | null
          track_stock?: boolean | null
          type?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          active?: boolean | null
          brand?: string | null
          cest?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          gtin?: string | null
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          markup?: number | null
          min_stock?: number | null
          model?: string | null
          name?: string
          ncm?: string | null
          origin?: string | null
          sale_price?: number | null
          sku?: string | null
          tax_cofins?: number | null
          tax_icms?: number | null
          tax_pis?: number | null
          track_stock?: boolean | null
          type?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          amount: number
          category_id: string | null
          client_id: string | null
          cost_center_id: string | null
          created_at: string
          day_of_month: number
          description: string
          direction: Database["public"]["Enums"]["transaction_direction"]
          end_date: string | null
          financial_account_id: string | null
          id: string
          is_active: boolean
          last_generated_month: string | null
          notes: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          day_of_month?: number
          description: string
          direction: Database["public"]["Enums"]["transaction_direction"]
          end_date?: string | null
          financial_account_id?: string | null
          id?: string
          is_active?: boolean
          last_generated_month?: string | null
          notes?: string | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          day_of_month?: number
          description?: string
          direction?: Database["public"]["Enums"]["transaction_direction"]
          end_date?: string | null
          financial_account_id?: string | null
          id?: string
          is_active?: boolean
          last_generated_month?: string | null
          notes?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_delivery_proofs: {
        Row: {
          created_at: string
          delivered_at: string
          delivered_by: string | null
          id: string
          notes: string | null
          photo_urls: string[] | null
          receiver_name: string
          receiver_position: string | null
          sale_id: string
          signature_storage_path: string
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string
          delivered_by?: string | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          receiver_name: string
          receiver_position?: string | null
          sale_id: string
          signature_storage_path: string
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string
          delivered_by?: string | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          receiver_name?: string
          receiver_position?: string | null
          sale_id?: string
          signature_storage_path?: string
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_delivery_proofs_delivered_by_fkey"
            columns: ["delivered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sale_delivery_proofs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_delivery_proofs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "sale_delivery_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_delivery_trips: {
        Row: {
          created_at: string
          current_lat: number | null
          current_lng: number | null
          destination_lat: number | null
          destination_lng: number | null
          distance_km: number | null
          driver_id: string | null
          estimated_distance_km: number | null
          finished_at: string | null
          id: string
          origin_lat: number | null
          origin_lng: number | null
          position_updated_at: string | null
          route_group_id: string | null
          route_order: number | null
          sale_id: string
          started_at: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number | null
          driver_id?: string | null
          estimated_distance_km?: number | null
          finished_at?: string | null
          id?: string
          origin_lat?: number | null
          origin_lng?: number | null
          position_updated_at?: string | null
          route_group_id?: string | null
          route_order?: number | null
          sale_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number | null
          driver_id?: string | null
          estimated_distance_km?: number | null
          finished_at?: string | null
          id?: string
          origin_lat?: number | null
          origin_lng?: number | null
          position_updated_at?: string | null
          route_group_id?: string | null
          route_order?: number | null
          sale_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_delivery_trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sale_delivery_trips_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_delivery_trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string | null
          description: string
          discount_type: string | null
          discount_value: number | null
          id: string
          product_id: string | null
          qty: number
          sale_id: string
          stock_deducted: boolean | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          product_id?: string | null
          qty?: number
          sale_id: string
          stock_deducted?: boolean | null
          total: number
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          product_id?: string | null
          qty?: number
          sale_id?: string
          stock_deducted?: boolean | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          approved_at: string | null
          client_id: string
          commission_percent: number | null
          commission_value: number | null
          created_at: string
          created_by: string
          discount_type: string | null
          discount_value: number | null
          id: string
          invoice_number: string | null
          invoiced_at: string | null
          notes: string | null
          payment_config: Json | null
          quote_valid_until: string | null
          sale_number: number
          seller_id: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          client_id: string
          commission_percent?: number | null
          commission_value?: number | null
          created_at?: string
          created_by: string
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          invoice_number?: string | null
          invoiced_at?: string | null
          notes?: string | null
          payment_config?: Json | null
          quote_valid_until?: string | null
          sale_number?: number
          seller_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          client_id?: string
          commission_percent?: number | null
          commission_value?: number | null
          created_at?: string
          created_by?: string
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          invoice_number?: string | null
          invoiced_at?: string | null
          notes?: string | null
          payment_config?: Json | null
          quote_valid_until?: string | null
          sale_number?: number
          seller_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      service_call_items: {
        Row: {
          created_at: string | null
          description: string
          discount_type: string | null
          discount_value: number | null
          id: string
          product_id: string | null
          qty: number | null
          service_call_id: string
          total: number
          type: Database["public"]["Enums"]["item_type"]
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description: string
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          product_id?: string | null
          qty?: number | null
          service_call_id: string
          total: number
          type: Database["public"]["Enums"]["item_type"]
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          product_id?: string | null
          qty?: number | null
          service_call_id?: string
          total?: number
          type?: Database["public"]["Enums"]["item_type"]
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_call_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_call_items_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      service_call_markers: {
        Row: {
          created_at: string
          created_by: string
          id: string
          service_call_id: string
          text: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          service_call_id: string
          text: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          service_call_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_call_markers_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      service_call_message_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_call_message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "service_call_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      service_call_message_mentions: {
        Row: {
          created_at: string | null
          id: string
          mentioned_user_id: string
          message_id: string
          notified_via_whatsapp: boolean | null
          seen_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mentioned_user_id: string
          message_id: string
          notified_via_whatsapp?: boolean | null
          seen_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mentioned_user_id?: string
          message_id?: string
          notified_via_whatsapp?: boolean | null
          seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_call_message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "service_call_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      service_call_messages: {
        Row: {
          author_id: string
          category: string | null
          content: string
          created_at: string | null
          due_date: string | null
          id: string
          priority: string | null
          requires_action: boolean | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          service_call_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          category?: string | null
          content: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          requires_action?: boolean | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          service_call_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          category?: string | null
          content?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          requires_action?: boolean | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          service_call_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_call_messages_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      service_call_statuses: {
        Row: {
          active: boolean
          color: string
          created_at: string
          display_order: number
          id: string
          is_default: boolean
          name: string
          status_type: Database["public"]["Enums"]["status_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          color: string
          created_at?: string
          display_order?: number
          id?: string
          is_default?: boolean
          name: string
          status_type?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          is_default?: boolean
          name?: string
          status_type?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
        }
        Relationships: []
      }
      service_call_trips: {
        Row: {
          created_at: string
          current_lat: number | null
          current_lng: number | null
          destination_lat: number | null
          destination_lng: number | null
          distance_km: number | null
          end_odometer_km: number | null
          estimated_distance_km: number | null
          finished_at: string | null
          id: string
          origin_lat: number | null
          origin_lng: number | null
          position_updated_at: string | null
          service_call_id: string
          start_odometer_km: number
          started_at: string
          status: Database["public"]["Enums"]["trip_status"]
          technician_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number | null
          end_odometer_km?: number | null
          estimated_distance_km?: number | null
          finished_at?: string | null
          id?: string
          origin_lat?: number | null
          origin_lng?: number | null
          position_updated_at?: string | null
          service_call_id: string
          start_odometer_km: number
          started_at?: string
          status?: Database["public"]["Enums"]["trip_status"]
          technician_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number | null
          end_odometer_km?: number | null
          estimated_distance_km?: number | null
          finished_at?: string | null
          id?: string
          origin_lat?: number | null
          origin_lng?: number | null
          position_updated_at?: string | null
          service_call_id?: string
          start_odometer_km?: number
          started_at?: string
          status?: Database["public"]["Enums"]["trip_status"]
          technician_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_call_trips_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_call_trips_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_call_trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_calls: {
        Row: {
          audio_url: string | null
          checklist_id: string | null
          checklist_responses: Json | null
          client_id: string
          commercial_status_id: string | null
          created_at: string
          created_by: string
          customer_name: string | null
          customer_position: string | null
          customer_signature_data: string | null
          customer_signature_date: string | null
          customer_signature_url: string | null
          discount_parts_type: string | null
          discount_parts_value: number | null
          discount_services_type: string | null
          discount_services_value: number | null
          discount_total_type: string | null
          discount_total_value: number | null
          equipment_description: string
          equipment_manufacturer: string | null
          equipment_sector: string | null
          equipment_serial_number: string | null
          has_financial_report: boolean
          id: string
          internal_notes_audio_url: string | null
          internal_notes_text: string | null
          media_urls: string[] | null
          notes: string | null
          os_number: number
          payment_config: Json | null
          photos_after_urls: string[] | null
          photos_before_urls: string[] | null
          problem_description: string | null
          purchase_order_number: string | null
          report_access_token: string | null
          report_pdf_path: string | null
          report_token_expires_at: string | null
          scheduled_date: string
          scheduled_time: string
          seen_by_tech_at: string | null
          service_type_id: string | null
          signatures: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["service_status"]
          status_id: string | null
          technical_diagnosis: string | null
          technical_diagnosis_audio_url: string | null
          technician_id: string
          technician_signature_data: string | null
          technician_signature_date: string | null
          technician_signature_url: string | null
          updated_at: string
          video_after_url: string | null
          video_before_url: string | null
        }
        Insert: {
          audio_url?: string | null
          checklist_id?: string | null
          checklist_responses?: Json | null
          client_id: string
          commercial_status_id?: string | null
          created_at?: string
          created_by: string
          customer_name?: string | null
          customer_position?: string | null
          customer_signature_data?: string | null
          customer_signature_date?: string | null
          customer_signature_url?: string | null
          discount_parts_type?: string | null
          discount_parts_value?: number | null
          discount_services_type?: string | null
          discount_services_value?: number | null
          discount_total_type?: string | null
          discount_total_value?: number | null
          equipment_description: string
          equipment_manufacturer?: string | null
          equipment_sector?: string | null
          equipment_serial_number?: string | null
          has_financial_report?: boolean
          id?: string
          internal_notes_audio_url?: string | null
          internal_notes_text?: string | null
          media_urls?: string[] | null
          notes?: string | null
          os_number?: number
          payment_config?: Json | null
          photos_after_urls?: string[] | null
          photos_before_urls?: string[] | null
          problem_description?: string | null
          purchase_order_number?: string | null
          report_access_token?: string | null
          report_pdf_path?: string | null
          report_token_expires_at?: string | null
          scheduled_date: string
          scheduled_time: string
          seen_by_tech_at?: string | null
          service_type_id?: string | null
          signatures?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["service_status"]
          status_id?: string | null
          technical_diagnosis?: string | null
          technical_diagnosis_audio_url?: string | null
          technician_id: string
          technician_signature_data?: string | null
          technician_signature_date?: string | null
          technician_signature_url?: string | null
          updated_at?: string
          video_after_url?: string | null
          video_before_url?: string | null
        }
        Update: {
          audio_url?: string | null
          checklist_id?: string | null
          checklist_responses?: Json | null
          client_id?: string
          commercial_status_id?: string | null
          created_at?: string
          created_by?: string
          customer_name?: string | null
          customer_position?: string | null
          customer_signature_data?: string | null
          customer_signature_date?: string | null
          customer_signature_url?: string | null
          discount_parts_type?: string | null
          discount_parts_value?: number | null
          discount_services_type?: string | null
          discount_services_value?: number | null
          discount_total_type?: string | null
          discount_total_value?: number | null
          equipment_description?: string
          equipment_manufacturer?: string | null
          equipment_sector?: string | null
          equipment_serial_number?: string | null
          has_financial_report?: boolean
          id?: string
          internal_notes_audio_url?: string | null
          internal_notes_text?: string | null
          media_urls?: string[] | null
          notes?: string | null
          os_number?: number
          payment_config?: Json | null
          photos_after_urls?: string[] | null
          photos_before_urls?: string[] | null
          problem_description?: string | null
          purchase_order_number?: string | null
          report_access_token?: string | null
          report_pdf_path?: string | null
          report_token_expires_at?: string | null
          scheduled_date?: string
          scheduled_time?: string
          seen_by_tech_at?: string | null
          service_type_id?: string | null
          signatures?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["service_status"]
          status_id?: string | null
          technical_diagnosis?: string | null
          technical_diagnosis_audio_url?: string | null
          technician_id?: string
          technician_signature_data?: string | null
          technician_signature_date?: string | null
          technician_signature_url?: string | null
          updated_at?: string
          video_after_url?: string | null
          video_before_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_calls_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_commercial_status_id_fkey"
            columns: ["commercial_status_id"]
            isOneToOne: false
            referencedRelation: "service_call_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "service_call_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          active: boolean
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          product_id: string
          qty: number
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          qty: number
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          qty?: number
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["stock_movement_type"]
          unit_cost?: number | null
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
      system_settings: {
        Row: {
          company_address: string | null
          company_cnpj: string | null
          company_email: string | null
          company_ie: string | null
          company_name: string | null
          company_phone: string | null
          company_website: string | null
          id: string
          logo_url: string | null
          report_logo: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          company_address?: string | null
          company_cnpj?: string | null
          company_email?: string | null
          company_ie?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_website?: string | null
          id?: string
          logo_url?: string | null
          report_logo?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          company_address?: string | null
          company_cnpj?: string | null
          company_email?: string | null
          company_ie?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_website?: string | null
          id?: string
          logo_url?: string | null
          report_logo?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      technician_reimbursements: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          ocr_extracted_amount: number | null
          paid_at: string | null
          payment_proof_url: string | null
          receipt_photo_url: string
          requested_at: string
          service_call_id: string
          status: string
          technician_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          ocr_extracted_amount?: number | null
          paid_at?: string | null
          payment_proof_url?: string | null
          receipt_photo_url: string
          requested_at?: string
          service_call_id: string
          status?: string
          technician_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          ocr_extracted_amount?: number | null
          paid_at?: string | null
          payment_proof_url?: string | null
          receipt_photo_url?: string
          requested_at?: string
          service_call_id?: string
          status?: string
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_reimbursements_service_call_id_fkey"
            columns: ["service_call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_reimbursements_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          active: boolean
          additional_notes: string | null
          created_at: string
          full_name: string
          id: string
          phone: string
          specialty_cooking: boolean | null
          specialty_refrigeration: boolean | null
          technician_number: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          additional_notes?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          specialty_cooking?: boolean | null
          specialty_refrigeration?: boolean | null
          technician_number?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          additional_notes?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          specialty_cooking?: boolean | null
          specialty_refrigeration?: boolean | null
          technician_number?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module: Database["public"]["Enums"]["system_module"]
          profile_type: Database["public"]["Enums"]["profile_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: Database["public"]["Enums"]["system_module"]
          profile_type?: Database["public"]["Enums"]["profile_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: Database["public"]["Enums"]["system_module"]
          profile_type?: Database["public"]["Enums"]["profile_type"]
          updated_at?: string
          user_id?: string
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
      vehicle_maintenances: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          maintenance_type: Database["public"]["Enums"]["maintenance_type"]
          started_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          maintenance_type: Database["public"]["Enums"]["maintenance_type"]
          started_at: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          maintenance_type?: Database["public"]["Enums"]["maintenance_type"]
          started_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenances_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          active: boolean
          brand: string | null
          color: string | null
          created_at: string
          current_odometer_km: number | null
          id: string
          insurance_broker: string | null
          insurance_broker_phone: string | null
          insurance_company: string | null
          insurance_phone: string | null
          insurance_policy_url: string | null
          name: string
          owner_document: string | null
          owner_name: string | null
          plate: string
          renavam: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand?: string | null
          color?: string | null
          created_at?: string
          current_odometer_km?: number | null
          id?: string
          insurance_broker?: string | null
          insurance_broker_phone?: string | null
          insurance_company?: string | null
          insurance_phone?: string | null
          insurance_policy_url?: string | null
          name: string
          owner_document?: string | null
          owner_name?: string | null
          plate: string
          renavam?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: string | null
          color?: string | null
          created_at?: string
          current_odometer_km?: number | null
          id?: string
          insurance_broker?: string | null
          insurance_broker_phone?: string | null
          insurance_company?: string | null
          insurance_phone?: string | null
          insurance_policy_url?: string | null
          name?: string
          owner_document?: string | null
          owner_name?: string | null
          plate?: string
          renavam?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      product_stock_balance: {
        Row: {
          balance: number | null
          product_id: string | null
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
    }
    Functions: {
      get_user_profile_type: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["profile_type"]
      }
      has_permission: {
        Args: {
          _module: Database["public"]["Enums"]["system_module"]
          _permission: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_technician_of_service_call: {
        Args: { _service_call_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "technician" | "client"
      attachment_type: "image" | "document" | "video"
      cadastro_tipo:
        | "cliente"
        | "fornecedor"
        | "transportador"
        | "funcionario"
        | "outro"
        | "colaborador"
      item_type: "PRODUCT" | "SERVICE" | "FEE" | "DISCOUNT"
      maintenance_type: "preventiva" | "corretiva" | "colisao"
      os_status:
        | "pending"
        | "in_progress"
        | "waiting_parts"
        | "completed"
        | "cancelled"
      profile_type: "gerencial" | "adm" | "tecnico"
      sale_status: "QUOTE" | "APPROVED" | "SALE" | "INVOICED" | "CANCELLED"
      service_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "on_hold"
      service_urgency: "corrective" | "preventive"
      status_type: "tecnico" | "comercial"
      stock_movement_type: "IN" | "OUT" | "ADJUST"
      system_module:
        | "service_calls"
        | "clients"
        | "technicians"
        | "vehicles"
        | "products"
        | "equipment"
        | "schedule"
        | "finances"
        | "settings"
        | "users"
        | "checklists"
        | "service_types"
        | "service_statuses"
        | "payment_methods"
        | "reimbursements"
      transaction_direction: "RECEIVE" | "PAY"
      transaction_origin: "SERVICE_CALL" | "MANUAL" | "SALE"
      transaction_status: "OPEN" | "PAID" | "CANCELED" | "PARTIAL"
      trip_status: "em_deslocamento" | "concluido"
      vehicle_status: "ativo" | "inativo" | "em_manutencao"
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
      app_role: ["admin", "technician", "client"],
      attachment_type: ["image", "document", "video"],
      cadastro_tipo: [
        "cliente",
        "fornecedor",
        "transportador",
        "funcionario",
        "outro",
        "colaborador",
      ],
      item_type: ["PRODUCT", "SERVICE", "FEE", "DISCOUNT"],
      maintenance_type: ["preventiva", "corretiva", "colisao"],
      os_status: [
        "pending",
        "in_progress",
        "waiting_parts",
        "completed",
        "cancelled",
      ],
      profile_type: ["gerencial", "adm", "tecnico"],
      sale_status: ["QUOTE", "APPROVED", "SALE", "INVOICED", "CANCELLED"],
      service_status: [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
        "on_hold",
      ],
      service_urgency: ["corrective", "preventive"],
      status_type: ["tecnico", "comercial"],
      stock_movement_type: ["IN", "OUT", "ADJUST"],
      system_module: [
        "service_calls",
        "clients",
        "technicians",
        "vehicles",
        "products",
        "equipment",
        "schedule",
        "finances",
        "settings",
        "users",
        "checklists",
        "service_types",
        "service_statuses",
        "payment_methods",
        "reimbursements",
      ],
      transaction_direction: ["RECEIVE", "PAY"],
      transaction_origin: ["SERVICE_CALL", "MANUAL", "SALE"],
      transaction_status: ["OPEN", "PAID", "CANCELED", "PARTIAL"],
      trip_status: ["em_deslocamento", "concluido"],
      vehicle_status: ["ativo", "inativo", "em_manutencao"],
    },
  },
} as const
