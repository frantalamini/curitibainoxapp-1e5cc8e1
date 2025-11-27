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
          state?: string | null
          state_registration?: string | null
          street?: string | null
          tipo?: Database["public"]["Enums"]["cadastro_tipo"] | null
          tipos?: Database["public"]["Enums"]["cadastro_tipo"][] | null
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
      service_calls: {
        Row: {
          audio_url: string | null
          checklist_id: string | null
          checklist_responses: Json | null
          client_id: string
          created_at: string
          created_by: string
          customer_name: string | null
          customer_position: string | null
          customer_signature_data: string | null
          customer_signature_date: string | null
          customer_signature_url: string | null
          equipment_description: string
          equipment_serial_number: string | null
          id: string
          internal_notes_audio_url: string | null
          internal_notes_text: string | null
          media_urls: string[] | null
          notes: string | null
          os_number: number
          photos_after_urls: string[] | null
          photos_before_urls: string[] | null
          problem_description: string | null
          report_pdf_path: string | null
          scheduled_date: string
          scheduled_time: string
          service_type_id: string | null
          signatures: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["service_status"]
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
          created_at?: string
          created_by: string
          customer_name?: string | null
          customer_position?: string | null
          customer_signature_data?: string | null
          customer_signature_date?: string | null
          customer_signature_url?: string | null
          equipment_description: string
          equipment_serial_number?: string | null
          id?: string
          internal_notes_audio_url?: string | null
          internal_notes_text?: string | null
          media_urls?: string[] | null
          notes?: string | null
          os_number?: number
          photos_after_urls?: string[] | null
          photos_before_urls?: string[] | null
          problem_description?: string | null
          report_pdf_path?: string | null
          scheduled_date: string
          scheduled_time: string
          service_type_id?: string | null
          signatures?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["service_status"]
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
          created_at?: string
          created_by?: string
          customer_name?: string | null
          customer_position?: string | null
          customer_signature_data?: string | null
          customer_signature_date?: string | null
          customer_signature_url?: string | null
          equipment_description?: string
          equipment_serial_number?: string | null
          id?: string
          internal_notes_audio_url?: string | null
          internal_notes_text?: string | null
          media_urls?: string[] | null
          notes?: string | null
          os_number?: number
          photos_after_urls?: string[] | null
          photos_before_urls?: string[] | null
          problem_description?: string | null
          report_pdf_path?: string | null
          scheduled_date?: string
          scheduled_time?: string
          service_type_id?: string | null
          signatures?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["service_status"]
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
            foreignKeyName: "service_calls_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
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
      app_role: "admin" | "technician" | "client"
      attachment_type: "image" | "document" | "video"
      cadastro_tipo:
        | "cliente"
        | "fornecedor"
        | "transportador"
        | "funcionario"
        | "outro"
        | "colaborador"
      os_status:
        | "pending"
        | "in_progress"
        | "waiting_parts"
        | "completed"
        | "cancelled"
      service_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "on_hold"
      service_urgency: "corrective" | "preventive"
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
      os_status: [
        "pending",
        "in_progress",
        "waiting_parts",
        "completed",
        "cancelled",
      ],
      service_status: [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
        "on_hold",
      ],
      service_urgency: ["corrective", "preventive"],
    },
  },
} as const
