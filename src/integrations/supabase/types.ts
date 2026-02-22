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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_audit_log: {
        Row: {
          action: string
          agent_id: string | null
          agent_nhi: string | null
          business_id: string
          cost_units: number | null
          created_at: string
          human_approval: string | null
          id: string
          payload: Json | null
          risk_flag: string | null
          tool_used: string | null
        }
        Insert: {
          action: string
          agent_id?: string | null
          agent_nhi?: string | null
          business_id: string
          cost_units?: number | null
          created_at?: string
          human_approval?: string | null
          id?: string
          payload?: Json | null
          risk_flag?: string | null
          tool_used?: string | null
        }
        Update: {
          action?: string
          agent_id?: string | null
          agent_nhi?: string | null
          business_id?: string
          cost_units?: number | null
          created_at?: string
          human_approval?: string | null
          id?: string
          payload?: Json | null
          risk_flag?: string | null
          tool_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_audit_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_configurations: {
        Row: {
          agent_type: string
          business_id: string
          config: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          last_token_at: string | null
          model: string | null
          name: string
          nhi_identifier: string | null
          permissions: Json | null
          system_prompt: string | null
          token_ttl_minutes: number | null
          updated_at: string
        }
        Insert: {
          agent_type: string
          business_id: string
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_token_at?: string | null
          model?: string | null
          name: string
          nhi_identifier?: string | null
          permissions?: Json | null
          system_prompt?: string | null
          token_ttl_minutes?: number | null
          updated_at?: string
        }
        Update: {
          agent_type?: string
          business_id?: string
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_token_at?: string | null
          model?: string | null
          name?: string
          nhi_identifier?: string | null
          permissions?: Json | null
          system_prompt?: string | null
          token_ttl_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_configurations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_goals: {
        Row: {
          agent_id: string | null
          business_id: string
          created_at: string
          description: string | null
          goal_type: string
          id: string
          metrics: Json | null
          parent_goal_id: string | null
          period_end: string | null
          period_start: string | null
          progress: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          business_id: string
          created_at?: string
          description?: string | null
          goal_type?: string
          id?: string
          metrics?: Json | null
          parent_goal_id?: string | null
          period_end?: string | null
          period_start?: string | null
          progress?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          business_id?: string
          created_at?: string
          description?: string | null
          goal_type?: string
          id?: string
          metrics?: Json | null
          parent_goal_id?: string | null
          period_end?: string | null
          period_start?: string | null
          progress?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_goals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_goals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_goals_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "agent_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_huddle_messages: {
        Row: {
          business_id: string
          content: string
          created_at: string
          huddle_id: string
          id: string
          sender_agent_id: string | null
          sender_name: string
          sender_type: string
        }
        Insert: {
          business_id: string
          content?: string
          created_at?: string
          huddle_id: string
          id?: string
          sender_agent_id?: string | null
          sender_name?: string
          sender_type?: string
        }
        Update: {
          business_id?: string
          content?: string
          created_at?: string
          huddle_id?: string
          id?: string
          sender_agent_id?: string | null
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_huddle_messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_huddle_messages_huddle_id_fkey"
            columns: ["huddle_id"]
            isOneToOne: false
            referencedRelation: "agent_huddles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_huddle_messages_sender_agent_id_fkey"
            columns: ["sender_agent_id"]
            isOneToOne: false
            referencedRelation: "agent_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_huddles: {
        Row: {
          business_id: string
          created_at: string
          huddle_type: string
          id: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          huddle_type?: string
          id?: string
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          huddle_type?: string
          id?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_huddles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_knowledge: {
        Row: {
          business_id: string
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          source: string | null
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          source?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          source?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_knowledge_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          business_id: string
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          key_label: string
          key_value: string
          notes: string | null
          service_name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          key_label: string
          key_value: string
          notes?: string | null
          service_name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          key_label?: string
          key_value?: string
          notes?: string | null
          service_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          created_at: string
          id: string
          name: string
          onboarding_completed: boolean
          owner_id: string
          settings: Json | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          onboarding_completed?: boolean
          owner_id: string
          settings?: Json | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          onboarding_completed?: boolean
          owner_id?: string
          settings?: Json | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      checkout_links: {
        Row: {
          amount: number
          business_id: string
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          business_id: string
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          id: string
          instagram: string | null
          lead_score: number | null
          name: string
          notes: string | null
          phone: string | null
          pipeline_stage: string | null
          tags: string[] | null
          total_revenue: number | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          lead_score?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          tags?: string[] | null
          total_revenue?: number | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          lead_score?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          tags?: string[] | null
          total_revenue?: number | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_campaigns: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
          status: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
          status?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drip_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_enrollments: {
        Row: {
          business_id: string
          campaign_id: string
          completed_at: string | null
          contact_id: string
          current_step: number
          enrolled_at: string
          id: string
          next_step_at: string | null
          status: string
        }
        Insert: {
          business_id: string
          campaign_id: string
          completed_at?: string | null
          contact_id: string
          current_step?: number
          enrolled_at?: string
          id?: string
          next_step_at?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          campaign_id?: string
          completed_at?: string | null
          contact_id?: string
          current_step?: number
          enrolled_at?: string
          id?: string
          next_step_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "drip_enrollments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_enrollments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "drip_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_steps: {
        Row: {
          body: string
          business_id: string
          campaign_id: string
          channel: string
          created_at: string
          delay_minutes: number
          id: string
          step_order: number
          subject: string | null
        }
        Insert: {
          body?: string
          business_id: string
          campaign_id: string
          channel?: string
          created_at?: string
          delay_minutes?: number
          id?: string
          step_order?: number
          subject?: string | null
        }
        Update: {
          body?: string
          business_id?: string
          campaign_id?: string
          channel?: string
          created_at?: string
          delay_minutes?: number
          id?: string
          step_order?: number
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drip_steps_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "drip_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_controls: {
        Row: {
          business_id: string
          config: Json | null
          control_type: string
          created_at: string
          id: string
          is_engaged: boolean | null
          target_agent_id: string | null
          triggered_at: string | null
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          config?: Json | null
          control_type: string
          created_at?: string
          id?: string
          is_engaged?: boolean | null
          target_agent_id?: string | null
          triggered_at?: string | null
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          config?: Json | null
          control_type?: string
          created_at?: string
          id?: string
          is_engaged?: boolean | null
          target_agent_id?: string | null
          triggered_at?: string | null
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_controls_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_controls_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "agent_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_logs: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          business_id: string
          channel: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          business_id: string
          channel?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          business_id?: string
          channel?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          business_id: string
          category: string
          content: string
          created_at: string
          fix_deadline: string | null
          fix_type: string | null
          id: string
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          sentiment: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: string
          content?: string
          created_at?: string
          fix_deadline?: string | null
          fix_type?: string | null
          id?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          sentiment?: string
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string
          content?: string
          created_at?: string
          fix_deadline?: string | null
          fix_type?: string | null
          id?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          sentiment?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      github_integrations: {
        Row: {
          access_token_secret_ref: string | null
          business_id: string
          created_at: string
          id: string
          is_active: boolean | null
          repo_name: string
          repo_owner: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          access_token_secret_ref?: string | null
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          repo_name: string
          repo_owner: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          access_token_secret_ref?: string | null
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          repo_name?: string
          repo_owner?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "github_integrations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      openclaw_configs: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          retry_policy: Json | null
          router_config: Json | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          retry_policy?: Json | null
          router_config?: Json | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          retry_policy?: Json | null
          router_config?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "openclaw_configs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          business_id: string
          contact_id: string | null
          created_at: string
          currency: string | null
          id: string
          items: Json | null
          metadata: Json | null
          order_number: string
          payment_status: string | null
          status: string | null
          total: number
          updated_at: string
        }
        Insert: {
          business_id: string
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          items?: Json | null
          metadata?: Json | null
          order_number: string
          payment_status?: string | null
          status?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          items?: Json | null
          metadata?: Json | null
          order_number?: string
          payment_status?: string | null
          status?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skill_library: {
        Row: {
          assigned_agent_ids: string[] | null
          business_id: string
          content: string | null
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          skill_type: string
          tags: string[] | null
          title: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          assigned_agent_ids?: string[] | null
          business_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          skill_type?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          assigned_agent_ids?: string[] | null
          business_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          skill_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_library_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_registry: {
        Row: {
          business_id: string
          created_at: string
          data_scope: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          max_calls_per_minute: number
          name: string
          risk_level: string
          total_invocations: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          data_scope?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          max_calls_per_minute?: number
          name: string
          risk_level?: string
          total_invocations?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          data_scope?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          max_calls_per_minute?: number
          name?: string
          risk_level?: string
          total_invocations?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_registry_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_business_owner: { Args: { _business_id: string }; Returns: boolean }
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
