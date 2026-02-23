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
      activities: {
        Row: {
          content: string | null
          created_at: string
          id: string
          lead_id: string
          metadata: Json | null
          type: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          lead_id: string
          metadata?: Json | null
          type: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_subscription_plans: {
        Row: {
          billing_cycle: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_leads: number | null
          max_users: number | null
          modules: string[] | null
          name: string
          price: number
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_leads?: number | null
          max_users?: number | null
          modules?: string[] | null
          name: string
          price?: number
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_leads?: number | null
          max_users?: number | null
          modules?: string[] | null
          name?: string
          price?: number
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_agent_conversations: {
        Row: {
          agent_id: string
          conversation_id: string
          handed_off_at: string | null
          id: string
          lead_id: string | null
          message_count: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          agent_id: string
          conversation_id: string
          handed_off_at?: string | null
          id?: string
          lead_id?: string | null
          message_count?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          agent_id?: string
          conversation_id?: string
          handed_off_at?: string | null
          id?: string
          lead_id?: string | null
          message_count?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          ai_provider: string | null
          created_at: string | null
          handoff_keywords: string[] | null
          id: string
          is_active: boolean | null
          max_messages_before_handoff: number | null
          name: string
          organization_id: string
          session_id: string | null
          system_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          ai_provider?: string | null
          created_at?: string | null
          handoff_keywords?: string[] | null
          id?: string
          is_active?: boolean | null
          max_messages_before_handoff?: number | null
          name?: string
          organization_id: string
          session_id?: string | null
          system_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_provider?: string | null
          created_at?: string | null
          handoff_keywords?: string[] | null
          id?: string
          is_active?: boolean | null
          max_messages_before_handoff?: number | null
          name?: string
          organization_id?: string
          session_id?: string | null
          system_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          button_text: string | null
          button_url: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          message: string
          send_notification: boolean | null
          show_banner: boolean | null
          target_organization_ids: string[] | null
          target_type: string | null
          target_user_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          button_text?: string | null
          button_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          send_notification?: boolean | null
          show_banner?: boolean | null
          target_organization_ids?: string[] | null
          target_type?: string | null
          target_user_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          button_text?: string | null
          button_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          send_notification?: boolean | null
          show_banner?: boolean | null
          target_organization_ids?: string[] | null
          target_type?: string | null
          target_user_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      assignments_log: {
        Row: {
          assigned_at: string | null
          assigned_user_id: string | null
          created_at: string
          id: string
          lead_id: string
          organization_id: string | null
          reason: string | null
          round_robin_id: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_user_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          organization_id?: string | null
          reason?: string | null
          round_robin_id?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_user_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          organization_id?: string | null
          reason?: string | null
          round_robin_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_log_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_log_round_robin_id_fkey"
            columns: ["round_robin_id"]
            isOneToOne: false
            referencedRelation: "round_robins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          organization_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_connections: {
        Row: {
          automation_id: string | null
          condition_branch: string | null
          created_at: string | null
          id: string
          source_handle: string | null
          source_node_id: string | null
          target_node_id: string | null
        }
        Insert: {
          automation_id?: string | null
          condition_branch?: string | null
          created_at?: string | null
          id?: string
          source_handle?: string | null
          source_node_id?: string | null
          target_node_id?: string | null
        }
        Update: {
          automation_id?: string | null
          condition_branch?: string | null
          created_at?: string | null
          id?: string
          source_handle?: string | null
          source_node_id?: string | null
          target_node_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_connections_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_connections_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "automation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_connections_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "automation_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_edges: {
        Row: {
          automation_id: string | null
          condition_config: Json | null
          created_at: string | null
          id: string
          source_node_id: string | null
          target_node_id: string | null
        }
        Insert: {
          automation_id?: string | null
          condition_config?: Json | null
          created_at?: string | null
          id?: string
          source_node_id?: string | null
          target_node_id?: string | null
        }
        Update: {
          automation_id?: string | null
          condition_config?: Json | null
          created_at?: string | null
          id?: string
          source_node_id?: string | null
          target_node_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_edges_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "automation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "automation_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          automation_id: string | null
          completed_at: string | null
          conversation_id: string | null
          current_node_id: string | null
          error_message: string | null
          execution_data: Json | null
          id: string
          lead_id: string | null
          next_execution_at: string | null
          organization_id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          automation_id?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          current_node_id?: string | null
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          lead_id?: string | null
          next_execution_at?: string | null
          organization_id: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          automation_id?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          current_node_id?: string | null
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          lead_id?: string | null
          next_execution_at?: string | null
          organization_id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_current_node_id_fkey"
            columns: ["current_node_id"]
            isOneToOne: false
            referencedRelation: "automation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_nodes: {
        Row: {
          action_type: string | null
          automation_id: string | null
          created_at: string | null
          id: string
          node_config: Json | null
          node_type: string
          position_x: number | null
          position_y: number | null
        }
        Insert: {
          action_type?: string | null
          automation_id?: string | null
          created_at?: string | null
          id?: string
          node_config?: Json | null
          node_type: string
          position_x?: number | null
          position_y?: number | null
        }
        Update: {
          action_type?: string | null
          automation_id?: string | null
          created_at?: string | null
          id?: string
          node_config?: Json | null
          node_type?: string
          position_x?: number | null
          position_y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_nodes_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          automation_id: string | null
          completed_at: string | null
          error_message: string | null
          execution_log: Json | null
          id: string
          lead_id: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          automation_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          lead_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          automation_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          lead_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          media_type: string | null
          media_url: string | null
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      available_permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      broker_monthly_goals: {
        Row: {
          created_at: string | null
          goal_amount: number
          id: string
          month: number
          organization_id: string
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          goal_amount?: number
          id?: string
          month: number
          organization_id: string
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          goal_amount?: number
          id?: string
          month?: number
          organization_id?: string
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      cadence_tasks_template: {
        Row: {
          cadence_template_id: string
          day_offset: number
          description: string | null
          id: string
          observation: string | null
          position: number | null
          recommended_message: string | null
          title: string
          type: string | null
        }
        Insert: {
          cadence_template_id: string
          day_offset?: number
          description?: string | null
          id?: string
          observation?: string | null
          position?: number | null
          recommended_message?: string | null
          title: string
          type?: string | null
        }
        Update: {
          cadence_template_id?: string
          day_offset?: number
          description?: string | null
          id?: string
          observation?: string | null
          position?: number | null
          recommended_message?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cadence_tasks_template_cadence_template_id_fkey"
            columns: ["cadence_template_id"]
            isOneToOne: false
            referencedRelation: "cadence_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      cadence_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          stage_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          stage_key: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          stage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadence_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          percentage: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          percentage?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          percentage?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          base_value: number | null
          calculated_value: number | null
          contract_id: string | null
          created_at: string | null
          forecast_date: string | null
          id: string
          lead_id: string | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          paid_by: string | null
          payment_proof: string | null
          percentage: number | null
          property_id: string | null
          rule_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          base_value?: number | null
          calculated_value?: number | null
          contract_id?: string | null
          created_at?: string | null
          forecast_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          paid_by?: string | null
          payment_proof?: string | null
          percentage?: number | null
          property_id?: string | null
          rule_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          base_value?: number | null
          calculated_value?: number | null
          contract_id?: string | null
          created_at?: string | null
          forecast_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_proof?: string | null
          percentage?: number | null
          property_id?: string | null
          rule_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_brokers: {
        Row: {
          commission_percentage: number | null
          contract_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          commission_percentage?: number | null
          contract_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          commission_percentage?: number | null
          contract_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_brokers_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_brokers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_sequences: {
        Row: {
          id: string
          last_number: number | null
          organization_id: string
        }
        Insert: {
          id?: string
          last_number?: number | null
          organization_id: string
        }
        Update: {
          id?: string
          last_number?: number | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          attachments: Json | null
          client_document: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          closing_date: string | null
          commission_percentage: number | null
          commission_value: number | null
          contract_number: string | null
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          down_payment: number | null
          end_date: string | null
          id: string
          installments: number | null
          lead_id: string | null
          notes: string | null
          organization_id: string
          payment_conditions: string | null
          property_id: string | null
          signing_date: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          attachments?: Json | null
          client_document?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          closing_date?: string | null
          commission_percentage?: number | null
          commission_value?: number | null
          contract_number?: string | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          down_payment?: number | null
          end_date?: string | null
          id?: string
          installments?: number | null
          lead_id?: string | null
          notes?: string | null
          organization_id: string
          payment_conditions?: string | null
          property_id?: string | null
          signing_date?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          attachments?: Json | null
          client_document?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          closing_date?: string | null
          commission_percentage?: number | null
          commission_value?: number | null
          contract_number?: string | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          down_payment?: number | null
          end_date?: string | null
          id?: string
          installments?: number | null
          lead_id?: string | null
          notes?: string | null
          organization_id?: string
          payment_conditions?: string | null
          property_id?: string | null
          signing_date?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_areas: {
        Row: {
          city: string
          created_at: string | null
          id: string
          is_active: boolean | null
          neighborhood: string
          organization_id: string
          uf: string
          updated_at: string | null
          zone: string | null
        }
        Insert: {
          city: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          neighborhood: string
          organization_id: string
          uf: string
          updated_at?: string | null
          zone?: string | null
        }
        Update: {
          city?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          neighborhood?: string
          organization_id?: string
          uf?: string
          updated_at?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coverage_areas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          description: string
          id: string
          organization_id: string
          responded_at: string | null
          responded_by: string | null
          status: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_response?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          organization_id: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          organization_id?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          type: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          type?: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          amount: number
          broker_id: string | null
          category: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          installment_number: number | null
          is_recurring: boolean | null
          lead_id: string | null
          notes: string | null
          organization_id: string
          paid_amount: number | null
          paid_date: string | null
          paid_value: number | null
          parent_entry_id: string | null
          payment_method: string | null
          recurring_type: string | null
          status: string | null
          total_installments: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          broker_id?: string | null
          category?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          installment_number?: number | null
          is_recurring?: boolean | null
          lead_id?: string | null
          notes?: string | null
          organization_id: string
          paid_amount?: number | null
          paid_date?: string | null
          paid_value?: number | null
          parent_entry_id?: string | null
          payment_method?: string | null
          recurring_type?: string | null
          status?: string | null
          total_installments?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          broker_id?: string | null
          category?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          installment_number?: number | null
          is_recurring?: boolean | null
          lead_id?: string | null
          notes?: string | null
          organization_id?: string
          paid_amount?: number | null
          paid_date?: string | null
          paid_value?: number | null
          parent_entry_id?: string | null
          payment_method?: string | null
          recurring_type?: string | null
          status?: string | null
          total_installments?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_parent_entry_id_fkey"
            columns: ["parent_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          category: string
          content: string
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          expires_at: string
          id: string
          organization_id: string
          role: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          organization_id: string
          role?: string | null
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          role?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignment_history: {
        Row: {
          assigned_by: string | null
          assigned_from: string | null
          assigned_to: string | null
          created_at: string | null
          id: string
          lead_id: string
          reason: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_from?: string | null
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          lead_id: string
          reason?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_from?: string | null
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignment_history_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_history_assigned_from_fkey"
            columns: ["assigned_from"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_history_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_meta: {
        Row: {
          ad_id: string | null
          ad_name: string | null
          adset_id: string | null
          adset_name: string | null
          campaign_id: string | null
          campaign_name: string | null
          contact_notes: string | null
          created_at: string
          creative_url: string | null
          form_id: string | null
          form_name: string | null
          id: string
          lead_id: string
          page_id: string | null
          platform: string | null
          raw_payload: Json | null
          source_type: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          ad_id?: string | null
          ad_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          contact_notes?: string | null
          created_at?: string
          creative_url?: string | null
          form_id?: string | null
          form_name?: string | null
          id?: string
          lead_id: string
          page_id?: string | null
          platform?: string | null
          raw_payload?: Json | null
          source_type?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          ad_id?: string | null
          ad_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          contact_notes?: string | null
          created_at?: string
          creative_url?: string | null
          form_id?: string | null
          form_name?: string | null
          id?: string
          lead_id?: string
          page_id?: string | null
          platform?: string | null
          raw_payload?: Json | null
          source_type?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_meta_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_pool_history: {
        Row: {
          from_user_id: string | null
          id: string
          lead_id: string | null
          organization_id: string | null
          reason: string | null
          redistributed_at: string | null
          to_user_id: string | null
        }
        Insert: {
          from_user_id?: string | null
          id?: string
          lead_id?: string | null
          organization_id?: string | null
          reason?: string | null
          redistributed_at?: string | null
          to_user_id?: string | null
        }
        Update: {
          from_user_id?: string | null
          id?: string
          lead_id?: string | null
          organization_id?: string | null
          reason?: string | null
          redistributed_at?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_pool_history_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pool_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pool_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pool_history_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_property_interests: {
        Row: {
          created_at: string | null
          id: string
          interest_level: string | null
          lead_id: string
          notes: string | null
          property_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interest_level?: string | null
          lead_id: string
          notes?: string | null
          property_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interest_level?: string | null
          lead_id?: string
          notes?: string | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_property_interests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_property_interests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stage_history: {
        Row: {
          duration_seconds: number | null
          entered_at: string | null
          exited_at: string | null
          id: string
          lead_id: string
          stage_id: string | null
          user_id: string | null
        }
        Insert: {
          duration_seconds?: number | null
          entered_at?: string | null
          exited_at?: string | null
          id?: string
          lead_id: string
          stage_id?: string | null
          user_id?: string | null
        }
        Update: {
          duration_seconds?: number | null
          entered_at?: string | null
          exited_at?: string | null
          id?: string
          lead_id?: string
          stage_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_stage_history_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_stage_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          id: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          lead_id: string
          tag_id: string
        }
        Update: {
          id?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tasks: {
        Row: {
          created_at: string
          day_offset: number
          description: string | null
          done_at: string | null
          done_by: string | null
          due_date: string | null
          id: string
          is_done: boolean | null
          lead_id: string
          outcome: string | null
          outcome_notes: string | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string
          day_offset?: number
          description?: string | null
          done_at?: string | null
          done_by?: string | null
          due_date?: string | null
          id?: string
          is_done?: boolean | null
          lead_id: string
          outcome?: string | null
          outcome_notes?: string | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string
          day_offset?: number
          description?: string | null
          done_at?: string | null
          done_by?: string | null
          due_date?: string | null
          id?: string
          is_done?: boolean | null
          lead_id?: string
          outcome?: string | null
          outcome_notes?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_tasks_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_timeline_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          lead_id: string
          metadata: Json | null
          organization_id: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          lead_id: string
          metadata?: Json | null
          organization_id: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
          organization_id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_timeline_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_timeline_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_timeline_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_at: string | null
          assigned_user_id: string | null
          bairro: string | null
          cargo: string | null
          cep: string | null
          cidade: string | null
          commission_percentage: number | null
          complemento: string | null
          created_at: string
          deal_status: string | null
          email: string | null
          empresa: string | null
          endereco: string | null
          faixa_valor_imovel: string | null
          finalidade_compra: string | null
          first_response_actor_user_id: string | null
          first_response_at: string | null
          first_response_channel: string | null
          first_response_is_automation: boolean | null
          first_response_seconds: number | null
          first_touch_actor_user_id: string | null
          first_touch_at: string | null
          first_touch_channel: string | null
          first_touch_seconds: number | null
          id: string
          interest_plan_id: string | null
          interest_property_id: string | null
          lost_at: string | null
          lost_reason: string | null
          message: string | null
          meta_form_id: string | null
          meta_lead_id: string | null
          name: string
          numero: string | null
          organization_id: string
          phone: string | null
          pipeline_id: string | null
          procura_financiamento: boolean | null
          profissao: string | null
          property_code: string | null
          property_id: string | null
          redistribution_count: number | null
          renda_familiar: string | null
          source: string | null
          source_session_id: string | null
          source_webhook_id: string | null
          stage_entered_at: string | null
          stage_id: string | null
          trabalha: boolean | null
          uf: string | null
          updated_at: string
          valor_interesse: number | null
          won_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_user_id?: string | null
          bairro?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          commission_percentage?: number | null
          complemento?: string | null
          created_at?: string
          deal_status?: string | null
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          faixa_valor_imovel?: string | null
          finalidade_compra?: string | null
          first_response_actor_user_id?: string | null
          first_response_at?: string | null
          first_response_channel?: string | null
          first_response_is_automation?: boolean | null
          first_response_seconds?: number | null
          first_touch_actor_user_id?: string | null
          first_touch_at?: string | null
          first_touch_channel?: string | null
          first_touch_seconds?: number | null
          id?: string
          interest_plan_id?: string | null
          interest_property_id?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          message?: string | null
          meta_form_id?: string | null
          meta_lead_id?: string | null
          name: string
          numero?: string | null
          organization_id: string
          phone?: string | null
          pipeline_id?: string | null
          procura_financiamento?: boolean | null
          profissao?: string | null
          property_code?: string | null
          property_id?: string | null
          redistribution_count?: number | null
          renda_familiar?: string | null
          source?: string | null
          source_session_id?: string | null
          source_webhook_id?: string | null
          stage_entered_at?: string | null
          stage_id?: string | null
          trabalha?: boolean | null
          uf?: string | null
          updated_at?: string
          valor_interesse?: number | null
          won_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_user_id?: string | null
          bairro?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          commission_percentage?: number | null
          complemento?: string | null
          created_at?: string
          deal_status?: string | null
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          faixa_valor_imovel?: string | null
          finalidade_compra?: string | null
          first_response_actor_user_id?: string | null
          first_response_at?: string | null
          first_response_channel?: string | null
          first_response_is_automation?: boolean | null
          first_response_seconds?: number | null
          first_touch_actor_user_id?: string | null
          first_touch_at?: string | null
          first_touch_channel?: string | null
          first_touch_seconds?: number | null
          id?: string
          interest_plan_id?: string | null
          interest_property_id?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          message?: string | null
          meta_form_id?: string | null
          meta_lead_id?: string | null
          name?: string
          numero?: string | null
          organization_id?: string
          phone?: string | null
          pipeline_id?: string | null
          procura_financiamento?: boolean | null
          profissao?: string | null
          property_code?: string | null
          property_id?: string | null
          redistribution_count?: number | null
          renda_familiar?: string | null
          source?: string | null
          source_session_id?: string | null
          source_webhook_id?: string | null
          stage_entered_at?: string | null
          stage_id?: string | null
          trabalha?: boolean | null
          uf?: string | null
          updated_at?: string
          valor_interesse?: number | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_first_response_actor_user_id_fkey"
            columns: ["first_response_actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_first_touch_actor_user_id_fkey"
            columns: ["first_touch_actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_interest_plan_id_fkey"
            columns: ["interest_plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_interest_property_id_fkey"
            columns: ["interest_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_webhook_id_fkey"
            columns: ["source_webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      media_jobs: {
        Row: {
          attempts: number | null
          conversation_id: string
          created_at: string | null
          error_message: string | null
          id: string
          max_attempts: number | null
          media_mime_type: string | null
          media_type: string
          message_id: string
          message_key: Json | null
          next_retry_at: string | null
          organization_id: string
          session_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          conversation_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          media_mime_type?: string | null
          media_type: string
          message_id: string
          message_key?: Json | null
          next_retry_at?: string | null
          organization_id: string
          session_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          conversation_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          media_mime_type?: string | null
          media_type?: string
          message_id?: string
          message_key?: Json | null
          next_retry_at?: string | null
          organization_id?: string
          session_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_jobs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_jobs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      member_availability: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string | null
          id: string
          is_active: boolean | null
          is_all_day: boolean | null
          start_time: string | null
          team_member_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          is_all_day?: boolean | null
          start_time?: string | null
          team_member_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          is_all_day?: boolean | null
          start_time?: string | null
          team_member_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_availability_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_form_configs: {
        Row: {
          assigned_user_id: string | null
          auto_tags: Json | null
          created_at: string
          custom_fields_config: Json | null
          default_status: string | null
          field_mapping: Json | null
          form_id: string
          form_name: string | null
          id: string
          integration_id: string
          is_active: boolean | null
          last_lead_at: string | null
          leads_received: number | null
          organization_id: string
          pipeline_id: string | null
          property_id: string | null
          stage_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          auto_tags?: Json | null
          created_at?: string
          custom_fields_config?: Json | null
          default_status?: string | null
          field_mapping?: Json | null
          form_id: string
          form_name?: string | null
          id?: string
          integration_id: string
          is_active?: boolean | null
          last_lead_at?: string | null
          leads_received?: number | null
          organization_id: string
          pipeline_id?: string | null
          property_id?: string | null
          stage_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          auto_tags?: Json | null
          created_at?: string
          custom_fields_config?: Json | null
          default_status?: string | null
          field_mapping?: Json | null
          form_id?: string
          form_name?: string | null
          id?: string
          integration_id?: string
          is_active?: boolean | null
          last_lead_at?: string | null
          leads_received?: number | null
          organization_id?: string
          pipeline_id?: string | null
          property_id?: string | null
          stage_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_form_configs_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_form_configs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "meta_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_form_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_form_configs_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_form_configs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_form_configs_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_integrations: {
        Row: {
          access_token: string | null
          assigned_user_id: string | null
          campaign_property_mapping: Json | null
          created_at: string
          default_status: string | null
          field_mapping: Json | null
          form_ids: Json | null
          id: string
          is_connected: boolean | null
          last_error: string | null
          last_lead_at: string | null
          last_sync_at: string | null
          leads_received: number | null
          organization_id: string
          page_id: string | null
          page_name: string | null
          pipeline_id: string | null
          stage_id: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          assigned_user_id?: string | null
          campaign_property_mapping?: Json | null
          created_at?: string
          default_status?: string | null
          field_mapping?: Json | null
          form_ids?: Json | null
          id?: string
          is_connected?: boolean | null
          last_error?: string | null
          last_lead_at?: string | null
          last_sync_at?: string | null
          leads_received?: number | null
          organization_id: string
          page_id?: string | null
          page_name?: string | null
          pipeline_id?: string | null
          stage_id?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          assigned_user_id?: string | null
          campaign_property_mapping?: Json | null
          created_at?: string
          default_status?: string | null
          field_mapping?: Json | null
          form_ids?: Json | null
          id?: string
          is_connected?: boolean | null
          last_error?: string | null
          last_lead_at?: string | null
          last_sync_at?: string | null
          leads_received?: number | null
          organization_id?: string
          page_id?: string | null
          page_name?: string | null
          pipeline_id?: string | null
          stage_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_integrations_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_integrations_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_integrations_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_read: boolean | null
          lead_id: string | null
          organization_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          organization_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          organization_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_modules: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          module_name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          module_name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          module_name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_role_permissions: {
        Row: {
          created_at: string
          id: string
          organization_role_id: string
          permission_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_role_id: string
          permission_key: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_role_id?: string
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_role_permissions_organization_role_id_fkey"
            columns: ["organization_role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_roles: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_sites: {
        Row: {
          about_image_url: string | null
          about_text: string | null
          about_title: string | null
          accent_color: string | null
          address: string | null
          background_color: string
          card_color: string
          city: string | null
          created_at: string
          custom_domain: string | null
          domain_verified: boolean
          domain_verified_at: string | null
          email: string | null
          facebook: string | null
          favicon_url: string | null
          google_analytics_id: string | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          instagram: string | null
          is_active: boolean
          linkedin: string | null
          logo_height: number | null
          logo_url: string | null
          logo_width: number | null
          organization_id: string
          page_banner_url: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          site_description: string | null
          site_theme: string
          site_title: string | null
          state: string | null
          subdomain: string | null
          text_color: string
          updated_at: string
          watermark_enabled: boolean | null
          watermark_logo_url: string | null
          watermark_opacity: number | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          about_image_url?: string | null
          about_text?: string | null
          about_title?: string | null
          accent_color?: string | null
          address?: string | null
          background_color?: string
          card_color?: string
          city?: string | null
          created_at?: string
          custom_domain?: string | null
          domain_verified?: boolean
          domain_verified_at?: string | null
          email?: string | null
          facebook?: string | null
          favicon_url?: string | null
          google_analytics_id?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          linkedin?: string | null
          logo_height?: number | null
          logo_url?: string | null
          logo_width?: number | null
          organization_id: string
          page_banner_url?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          site_description?: string | null
          site_theme?: string
          site_title?: string | null
          state?: string | null
          subdomain?: string | null
          text_color?: string
          updated_at?: string
          watermark_enabled?: boolean | null
          watermark_logo_url?: string | null
          watermark_opacity?: number | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          about_image_url?: string | null
          about_text?: string | null
          about_title?: string | null
          accent_color?: string | null
          address?: string | null
          background_color?: string
          card_color?: string
          city?: string | null
          created_at?: string
          custom_domain?: string | null
          domain_verified?: boolean
          domain_verified_at?: string | null
          email?: string | null
          facebook?: string | null
          favicon_url?: string | null
          google_analytics_id?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          linkedin?: string | null
          logo_height?: number | null
          logo_url?: string | null
          logo_width?: number | null
          organization_id?: string
          page_banner_url?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          site_description?: string | null
          site_theme?: string
          site_title?: string | null
          state?: string | null
          subdomain?: string | null
          text_color?: string
          updated_at?: string
          watermark_enabled?: boolean | null
          watermark_logo_url?: string | null
          watermark_opacity?: number | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_sites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          accent_color: string | null
          admin_notes: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          created_by: string | null
          default_commission_percentage: number | null
          email: string | null
          endereco: string | null
          id: string
          inscricao_estadual: string | null
          is_active: boolean
          last_access_at: string | null
          logo_size: number | null
          logo_url: string | null
          max_users: number
          name: string
          nome_fantasia: string | null
          numero: string | null
          plan_id: string | null
          razao_social: string | null
          segment: string | null
          subscription_status: string
          subscription_type: string | null
          telefone: string | null
          theme_mode: string | null
          trial_ends_at: string | null
          uf: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          accent_color?: string | null
          admin_notes?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          default_commission_percentage?: number | null
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          is_active?: boolean
          last_access_at?: string | null
          logo_size?: number | null
          logo_url?: string | null
          max_users?: number
          name: string
          nome_fantasia?: string | null
          numero?: string | null
          plan_id?: string | null
          razao_social?: string | null
          segment?: string | null
          subscription_status?: string
          subscription_type?: string | null
          telefone?: string | null
          theme_mode?: string | null
          trial_ends_at?: string | null
          uf?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          accent_color?: string | null
          admin_notes?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          default_commission_percentage?: number | null
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          is_active?: boolean
          last_access_at?: string | null
          logo_size?: number | null
          logo_url?: string | null
          max_users?: number
          name?: string
          nome_fantasia?: string | null
          numero?: string | null
          plan_id?: string | null
          razao_social?: string | null
          segment?: string | null
          subscription_status?: string
          subscription_type?: string | null
          telefone?: string | null
          theme_mode?: string | null
          trial_ends_at?: string | null
          uf?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "admin_subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string | null
          id: string
          key: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
        }
        Relationships: []
      }
      pipeline_sla_settings: {
        Row: {
          created_at: string | null
          critical_hours: number | null
          id: string
          pipeline_id: string
          sla_start_field: string | null
          stage_id: string | null
          updated_at: string | null
          warning_hours: number | null
        }
        Insert: {
          created_at?: string | null
          critical_hours?: number | null
          id?: string
          pipeline_id: string
          sla_start_field?: string | null
          stage_id?: string | null
          updated_at?: string | null
          warning_hours?: number | null
        }
        Update: {
          created_at?: string | null
          critical_hours?: number | null
          id?: string
          pipeline_id?: string
          sla_start_field?: string | null
          stage_id?: string | null
          updated_at?: string | null
          warning_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_sla_settings_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_sla_settings_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          default_round_robin_id: string | null
          first_response_start: string | null
          id: string
          include_automation_in_first_response: boolean | null
          is_default: boolean | null
          name: string
          organization_id: string
          pool_enabled: boolean | null
          pool_max_redistributions: number | null
          pool_timeout_minutes: number | null
        }
        Insert: {
          created_at?: string
          default_round_robin_id?: string | null
          first_response_start?: string | null
          id?: string
          include_automation_in_first_response?: boolean | null
          is_default?: boolean | null
          name: string
          organization_id: string
          pool_enabled?: boolean | null
          pool_max_redistributions?: number | null
          pool_timeout_minutes?: number | null
        }
        Update: {
          created_at?: string
          default_round_robin_id?: string | null
          first_response_start?: string | null
          id?: string
          include_automation_in_first_response?: boolean | null
          is_default?: boolean | null
          name?: string
          organization_id?: string
          pool_enabled?: boolean | null
          pool_max_redistributions?: number | null
          pool_timeout_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_default_round_robin_id_fkey"
            columns: ["default_round_robin_id"]
            isOneToOne: false
            referencedRelation: "round_robins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          andar: number | null
          ano_construcao: number | null
          area_total: number | null
          area_util: number | null
          bairro: string | null
          banheiros: number | null
          cep: string | null
          cidade: string | null
          city_id: string | null
          code: string
          commission_percentage: number | null
          complemento: string | null
          condominio: number | null
          condominium_id: string | null
          created_at: string
          descricao: string | null
          destaque: boolean | null
          detalhes_extras: string[] | null
          endereco: string | null
          fotos: Json | null
          id: string
          imagem_principal: string | null
          iptu: number | null
          latitude: number | null
          longitude: number | null
          mobilia: string | null
          neighborhood_id: string | null
          numero: string | null
          organization_id: string
          preco: number | null
          proximidades: string[] | null
          quartos: number | null
          regra_pet: boolean | null
          seguro_incendio: number | null
          status: string | null
          suites: number | null
          taxa_de_servico: number | null
          tipo_de_imovel: string | null
          tipo_de_negocio: string | null
          title: string | null
          uf: string | null
          updated_at: string
          vagas: number | null
          video_imovel: string | null
        }
        Insert: {
          andar?: number | null
          ano_construcao?: number | null
          area_total?: number | null
          area_util?: number | null
          bairro?: string | null
          banheiros?: number | null
          cep?: string | null
          cidade?: string | null
          city_id?: string | null
          code: string
          commission_percentage?: number | null
          complemento?: string | null
          condominio?: number | null
          condominium_id?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean | null
          detalhes_extras?: string[] | null
          endereco?: string | null
          fotos?: Json | null
          id?: string
          imagem_principal?: string | null
          iptu?: number | null
          latitude?: number | null
          longitude?: number | null
          mobilia?: string | null
          neighborhood_id?: string | null
          numero?: string | null
          organization_id: string
          preco?: number | null
          proximidades?: string[] | null
          quartos?: number | null
          regra_pet?: boolean | null
          seguro_incendio?: number | null
          status?: string | null
          suites?: number | null
          taxa_de_servico?: number | null
          tipo_de_imovel?: string | null
          tipo_de_negocio?: string | null
          title?: string | null
          uf?: string | null
          updated_at?: string
          vagas?: number | null
          video_imovel?: string | null
        }
        Update: {
          andar?: number | null
          ano_construcao?: number | null
          area_total?: number | null
          area_util?: number | null
          bairro?: string | null
          banheiros?: number | null
          cep?: string | null
          cidade?: string | null
          city_id?: string | null
          code?: string
          commission_percentage?: number | null
          complemento?: string | null
          condominio?: number | null
          condominium_id?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean | null
          detalhes_extras?: string[] | null
          endereco?: string | null
          fotos?: Json | null
          id?: string
          imagem_principal?: string | null
          iptu?: number | null
          latitude?: number | null
          longitude?: number | null
          mobilia?: string | null
          neighborhood_id?: string | null
          numero?: string | null
          organization_id?: string
          preco?: number | null
          proximidades?: string[] | null
          quartos?: number | null
          regra_pet?: boolean | null
          seguro_incendio?: number | null
          status?: string | null
          suites?: number | null
          taxa_de_servico?: number | null
          tipo_de_imovel?: string | null
          tipo_de_negocio?: string | null
          title?: string | null
          uf?: string | null
          updated_at?: string
          vagas?: number | null
          video_imovel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "property_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "property_condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "property_neighborhoods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_cities: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          uf: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          uf?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_cities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_condominiums: {
        Row: {
          address: string | null
          city_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          neighborhood_id: string | null
          organization_id: string
        }
        Insert: {
          address?: string | null
          city_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          neighborhood_id?: string | null
          organization_id: string
        }
        Update: {
          address?: string | null
          city_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          neighborhood_id?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_condominiums_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "property_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_condominiums_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "property_neighborhoods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_condominiums_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_features: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_features_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_neighborhoods: {
        Row: {
          city_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
        }
        Update: {
          city_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_neighborhoods_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "property_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_neighborhoods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_proximities: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_proximities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_sequences: {
        Row: {
          id: string
          last_number: number | null
          organization_id: string
          prefix: string
        }
        Insert: {
          id?: string
          last_number?: number | null
          organization_id: string
          prefix: string
        }
        Update: {
          id?: string
          last_number?: number | null
          organization_id?: string
          prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_types: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string | null
          device_info: Json | null
          id: string
          is_active: boolean | null
          organization_id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      round_robin_logs: {
        Row: {
          assigned_user_id: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          member_id: string | null
          organization_id: string | null
          reason: string | null
          round_robin_id: string | null
          rule_matched: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          member_id?: string | null
          organization_id?: string | null
          reason?: string | null
          round_robin_id?: string | null
          rule_matched?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          member_id?: string | null
          organization_id?: string | null
          reason?: string | null
          round_robin_id?: string | null
          rule_matched?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_robin_logs_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_robin_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_robin_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "round_robin_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_robin_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_robin_logs_round_robin_id_fkey"
            columns: ["round_robin_id"]
            isOneToOne: false
            referencedRelation: "round_robins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_robin_logs_rule_matched_fkey"
            columns: ["rule_matched"]
            isOneToOne: false
            referencedRelation: "round_robin_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      round_robin_members: {
        Row: {
          id: string
          leads_count: number | null
          position: number
          round_robin_id: string
          team_id: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          id?: string
          leads_count?: number | null
          position?: number
          round_robin_id: string
          team_id?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          id?: string
          leads_count?: number | null
          position?: number
          round_robin_id?: string
          team_id?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "round_robin_members_round_robin_id_fkey"
            columns: ["round_robin_id"]
            isOneToOne: false
            referencedRelation: "round_robins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_robin_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_robin_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      round_robin_rules: {
        Row: {
          id: string
          is_active: boolean | null
          match: Json | null
          match_type: string
          match_value: string
          priority: number | null
          round_robin_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          match?: Json | null
          match_type: string
          match_value: string
          priority?: number | null
          round_robin_id: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          match?: Json | null
          match_type?: string
          match_value?: string
          priority?: number | null
          round_robin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_robin_rules_round_robin_id_fkey"
            columns: ["round_robin_id"]
            isOneToOne: false
            referencedRelation: "round_robins"
            referencedColumns: ["id"]
          },
        ]
      }
      round_robins: {
        Row: {
          ai_agent_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_assigned_index: number | null
          leads_distributed: number | null
          name: string
          organization_id: string
          reentry_behavior: string | null
          settings: Json | null
          strategy: string | null
          target_pipeline_id: string | null
          target_stage_id: string | null
        }
        Insert: {
          ai_agent_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_assigned_index?: number | null
          leads_distributed?: number | null
          name: string
          organization_id: string
          reentry_behavior?: string | null
          settings?: Json | null
          strategy?: string | null
          target_pipeline_id?: string | null
          target_stage_id?: string | null
        }
        Update: {
          ai_agent_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_assigned_index?: number | null
          leads_distributed?: number | null
          name?: string
          organization_id?: string
          reentry_behavior?: string | null
          settings?: Json | null
          strategy?: string | null
          target_pipeline_id?: string | null
          target_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_robins_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_robins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_robins_target_pipeline_id_fkey"
            columns: ["target_pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_robins_target_stage_id_fkey"
            columns: ["target_stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_events: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string
          event_type: string | null
          google_event_id: string | null
          id: string
          is_all_day: boolean | null
          lead_id: string | null
          location: string | null
          organization_id: string
          property_id: string | null
          reminder_minutes: number | null
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time: string
          event_type?: string | null
          google_event_id?: string | null
          id?: string
          is_all_day?: boolean | null
          lead_id?: string | null
          location?: string | null
          organization_id: string
          property_id?: string | null
          reminder_minutes?: number | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string
          event_type?: string | null
          google_event_id?: string | null
          id?: string
          is_all_day?: boolean | null
          lead_id?: string | null
          location?: string | null
          organization_id?: string
          property_id?: string | null
          reminder_minutes?: number | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_plans: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string | null
          features: string[] | null
          id: string
          is_active: boolean | null
          is_promo: boolean | null
          name: string
          organization_id: string
          price: number | null
          speed_mb: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_promo?: boolean | null
          name: string
          organization_id: string
          price?: number | null
          speed_mb?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_promo?: boolean | null
          name?: string
          organization_id?: string
          price?: number | null
          speed_mb?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_automations: {
        Row: {
          action_config: Json | null
          action_type: string
          alert_message: string | null
          automation_type: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          stage_id: string | null
          target_stage_id: string | null
          trigger_days: number | null
          trigger_type: string
          updated_at: string | null
          whatsapp_template: string | null
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          alert_message?: string | null
          automation_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          stage_id?: string | null
          target_stage_id?: string | null
          trigger_days?: number | null
          trigger_type: string
          updated_at?: string | null
          whatsapp_template?: string | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          alert_message?: string | null
          automation_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          stage_id?: string | null
          target_stage_id?: string | null
          trigger_days?: number | null
          trigger_type?: string
          updated_at?: string | null
          whatsapp_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_automations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_automations_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_automations_target_stage_id_fkey"
            columns: ["target_stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          color: string | null
          id: string
          name: string
          pipeline_id: string
          position: number
          stage_key: string
        }
        Insert: {
          color?: string | null
          id?: string
          name: string
          pipeline_id: string
          position?: number
          stage_key: string
        }
        Update: {
          color?: string | null
          id?: string
          name?: string
          pipeline_id?: string
          position?: number
          stage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          is_leader: boolean | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_leader?: boolean | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_leader?: boolean | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_pipelines: {
        Row: {
          created_at: string
          id: string
          pipeline_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pipeline_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pipeline_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_pipelines_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_pipelines_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      telecom_billing: {
        Row: {
          amount: number | null
          billing_month: string
          billing_status: string | null
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          organization_id: string
          payment_status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          billing_month: string
          billing_status?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          organization_id: string
          payment_status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          billing_month?: string
          billing_status?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          payment_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telecom_billing_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "telecom_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telecom_billing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      telecom_customers: {
        Row: {
          address: string | null
          birth_date: string | null
          cep: string | null
          chip_category: string | null
          chip_quantity: number | null
          city: string | null
          complement: string | null
          contract_date: string | null
          contracted_plan: string | null
          cpf_cnpj: string | null
          created_at: string | null
          due_day: number | null
          email: string | null
          external_id: string | null
          id: string
          installation_date: string | null
          is_combo: boolean | null
          is_portability: boolean | null
          lead_id: string | null
          mesh_quantity: number | null
          mesh_repeater: string | null
          mother_name: string | null
          name: string
          neighborhood: string | null
          notes: string | null
          number: string | null
          organization_id: string
          payment_method: string | null
          phone: string | null
          phone2: string | null
          plan_code: string | null
          plan_id: string | null
          plan_value: number | null
          rg: string | null
          seller_id: string | null
          status: string | null
          uf: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          cep?: string | null
          chip_category?: string | null
          chip_quantity?: number | null
          city?: string | null
          complement?: string | null
          contract_date?: string | null
          contracted_plan?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          due_day?: number | null
          email?: string | null
          external_id?: string | null
          id?: string
          installation_date?: string | null
          is_combo?: boolean | null
          is_portability?: boolean | null
          lead_id?: string | null
          mesh_quantity?: number | null
          mesh_repeater?: string | null
          mother_name?: string | null
          name: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          organization_id: string
          payment_method?: string | null
          phone?: string | null
          phone2?: string | null
          plan_code?: string | null
          plan_id?: string | null
          plan_value?: number | null
          rg?: string | null
          seller_id?: string | null
          status?: string | null
          uf?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          cep?: string | null
          chip_category?: string | null
          chip_quantity?: number | null
          city?: string | null
          complement?: string | null
          contract_date?: string | null
          contracted_plan?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          due_day?: number | null
          email?: string | null
          external_id?: string | null
          id?: string
          installation_date?: string | null
          is_combo?: boolean | null
          is_portability?: boolean | null
          lead_id?: string | null
          mesh_quantity?: number | null
          mesh_repeater?: string | null
          mother_name?: string | null
          name?: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          organization_id?: string
          payment_method?: string | null
          phone?: string | null
          phone2?: string | null
          plan_code?: string | null
          plan_id?: string | null
          plan_value?: number | null
          rg?: string | null
          seller_id?: string | null
          status?: string | null
          uf?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telecom_customers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telecom_customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telecom_customers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telecom_customers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_org_cache: {
        Row: {
          organization_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_org_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organization_roles: {
        Row: {
          created_at: string
          id: string
          organization_role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organization_roles_organization_role_id_fkey"
            columns: ["organization_role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organization_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          id?: string
          permission_key: string
          user_id: string
        }
        Update: {
          id?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          email: string
          endereco: string | null
          id: string
          is_active: boolean | null
          language: string | null
          name: string
          numero: string | null
          organization_id: string | null
          phone: string | null
          role: string | null
          uf: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          endereco?: string | null
          id: string
          is_active?: boolean | null
          language?: string | null
          name: string
          numero?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          uf?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          endereco?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          name?: string
          numero?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          uf?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string | null
          events: string[]
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          organization_id: string
          secret: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          organization_id: string
          secret?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          organization_id?: string
          secret?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks_integrations: {
        Row: {
          api_token: string
          created_at: string
          created_by: string | null
          field_mapping: Json | null
          id: string
          is_active: boolean
          last_lead_at: string | null
          last_triggered_at: string | null
          leads_received: number
          name: string
          organization_id: string
          target_pipeline_id: string | null
          target_property_id: string | null
          target_stage_id: string | null
          target_tag_ids: string[] | null
          target_team_id: string | null
          trigger_events: string[] | null
          type: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_token?: string
          created_at?: string
          created_by?: string | null
          field_mapping?: Json | null
          id?: string
          is_active?: boolean
          last_lead_at?: string | null
          last_triggered_at?: string | null
          leads_received?: number
          name: string
          organization_id: string
          target_pipeline_id?: string | null
          target_property_id?: string | null
          target_stage_id?: string | null
          target_tag_ids?: string[] | null
          target_team_id?: string | null
          trigger_events?: string[] | null
          type?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_token?: string
          created_at?: string
          created_by?: string | null
          field_mapping?: Json | null
          id?: string
          is_active?: boolean
          last_lead_at?: string | null
          last_triggered_at?: string | null
          leads_received?: number
          name?: string
          organization_id?: string
          target_pipeline_id?: string | null
          target_property_id?: string | null
          target_stage_id?: string | null
          target_tag_ids?: string[] | null
          target_team_id?: string | null
          trigger_events?: string[] | null
          type?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_integrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_integrations_target_pipeline_id_fkey"
            columns: ["target_pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_integrations_target_property_id_fkey"
            columns: ["target_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_integrations_target_stage_id_fkey"
            columns: ["target_stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_integrations_target_team_id_fkey"
            columns: ["target_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          archived_at: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_picture: string | null
          contact_presence: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_group: boolean | null
          last_message: string | null
          last_message_at: string | null
          lead_id: string | null
          organization_id: string | null
          presence_updated_at: string | null
          remote_jid: string
          session_id: string
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_picture?: string | null
          contact_presence?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          organization_id?: string | null
          presence_updated_at?: string | null
          remote_jid: string
          session_id: string
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_picture?: string | null
          contact_presence?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          organization_id?: string | null
          presence_updated_at?: string | null
          remote_jid?: string
          session_id?: string
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          client_message_id: string | null
          content: string | null
          conversation_id: string
          delivered_at: string | null
          from_me: boolean
          id: string
          media_error: string | null
          media_mime_type: string | null
          media_size: number | null
          media_status: string | null
          media_storage_path: string | null
          media_url: string | null
          message_id: string
          message_type: string | null
          read_at: string | null
          sender_jid: string | null
          sender_name: string | null
          sent_at: string
          session_id: string
          status: string | null
        }
        Insert: {
          client_message_id?: string | null
          content?: string | null
          conversation_id: string
          delivered_at?: string | null
          from_me?: boolean
          id?: string
          media_error?: string | null
          media_mime_type?: string | null
          media_size?: number | null
          media_status?: string | null
          media_storage_path?: string | null
          media_url?: string | null
          message_id: string
          message_type?: string | null
          read_at?: string | null
          sender_jid?: string | null
          sender_name?: string | null
          sent_at?: string
          session_id: string
          status?: string | null
        }
        Update: {
          client_message_id?: string | null
          content?: string | null
          conversation_id?: string
          delivered_at?: string | null
          from_me?: boolean
          id?: string
          media_error?: string | null
          media_mime_type?: string | null
          media_size?: number | null
          media_status?: string | null
          media_storage_path?: string | null
          media_url?: string | null
          message_id?: string
          message_type?: string | null
          read_at?: string | null
          sender_jid?: string | null
          sender_name?: string | null
          sent_at?: string
          session_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_session_access: {
        Row: {
          can_send: boolean | null
          can_view: boolean | null
          created_at: string
          granted_by: string | null
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          can_send?: boolean | null
          can_view?: boolean | null
          created_at?: string
          granted_by?: string | null
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          can_send?: boolean | null
          can_view?: boolean | null
          created_at?: string
          granted_by?: string | null
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_session_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_session_access_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_session_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          instance_id: string | null
          instance_name: string
          is_active: boolean | null
          is_notification_session: boolean | null
          last_connected_at: string | null
          organization_id: string
          owner_user_id: string
          phone_number: string | null
          profile_name: string | null
          profile_picture: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          instance_id?: string | null
          instance_name: string
          is_active?: boolean | null
          is_notification_session?: boolean | null
          last_connected_at?: string | null
          organization_id: string
          owner_user_id: string
          phone_number?: string | null
          profile_name?: string | null
          profile_picture?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string
          is_active?: boolean | null
          is_notification_session?: boolean | null
          last_connected_at?: string | null
          organization_id?: string
          owner_user_id?: string
          phone_number?: string | null
          profile_name?: string | null
          profile_picture?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sessions_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: undefined }
      can_access_lead: {
        Args: { p_lead_id: string; p_user_id?: string }
        Returns: boolean
      }
      can_access_whatsapp_session: {
        Args: { p_session_id: string; p_user_id?: string }
        Returns: boolean
      }
      can_manage_session: { Args: { session_id: string }; Returns: boolean }
      cleanup_orphan_members: { Args: never; Returns: Json }
      create_default_stages_for_pipeline: {
        Args: { p_org_id: string; p_pipeline_id: string }
        Returns: undefined
      }
      create_notification:
        | {
            Args: {
              p_content: string
              p_lead_id?: string
              p_organization_id: string
              p_title: string
              p_type?: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_content: string
              p_reference_id?: string
              p_reference_type?: string
              p_title: string
              p_type?: string
              p_user_id: string
            }
            Returns: string
          }
      find_orphan_rr_members: {
        Args: never
        Returns: {
          member_id: string
          queue_name: string
          reason: string
          round_robin_id: string
          user_id: string
        }[]
      }
      find_orphan_team_members: {
        Args: never
        Returns: {
          member_id: string
          reason: string
          team_id: string
          team_name: string
          user_id: string
        }[]
      }
      get_dashboard_stats: { Args: never; Returns: Json }
      get_database_stats_admin: { Args: never; Returns: Json }
      get_funnel_data: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_pipeline_id?: string
          p_source?: string
          p_team_id?: string
          p_user_id?: string
        }
        Returns: {
          lead_count: number
          stage_id: string
          stage_key: string
          stage_name: string
          stage_order: number
        }[]
      }
      get_lead_sources_data: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_pipeline_id?: string
          p_source?: string
          p_team_id?: string
          p_user_id?: string
        }
        Returns: {
          lead_count: number
          source_name: string
        }[]
      }
      get_session_owner: { Args: { session_id: string }; Returns: string }
      get_team_member_ids: { Args: { p_team_id: string }; Returns: string[] }
      get_telephony_metrics: {
        Args: {
          p_end_date?: string
          p_organization_id: string
          p_start_date?: string
          p_user_id?: string
        }
        Returns: {
          answered_calls: number
          avg_duration: number
          missed_calls: number
          total_calls: number
          total_duration: number
        }[]
      }
      get_telephony_ranking: {
        Args: {
          p_end_date?: string
          p_limit?: number
          p_organization_id: string
          p_start_date?: string
        }
        Returns: {
          answered_calls: number
          total_calls: number
          total_duration: number
          user_id: string
          user_name: string
        }[]
      }
      get_user_led_pipeline_ids: { Args: never; Returns: string[] }
      get_user_led_team_ids: { Args: never; Returns: string[] }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_organization_role: {
        Args: { p_user_id?: string }
        Returns: {
          permissions: string[]
          role_color: string
          role_id: string
          role_name: string
        }[]
      }
      get_user_team_ids: { Args: never; Returns: string[] }
      handle_lead_intake: { Args: { p_lead_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_member_available: { Args: { p_user_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_team_leader: { Args: { check_user_id?: string }; Returns: boolean }
      list_all_organizations_admin: {
        Args: never
        Returns: {
          admin_notes: string
          created_at: string
          id: string
          is_active: boolean
          last_access_at: string
          lead_count: number
          logo_url: string
          max_users: number
          name: string
          subscription_status: string
          user_count: number
        }[]
      }
      list_all_users_admin: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          organization_name: string
          role: string
        }[]
      }
      list_contacts_paginated: {
        Args: {
          p_assignee_id?: string
          p_created_from?: string
          p_created_to?: string
          p_deal_status?: string
          p_limit?: number
          p_page?: number
          p_pipeline_id?: string
          p_search?: string
          p_sort_by?: string
          p_sort_dir?: string
          p_source?: string
          p_stage_id?: string
          p_tag_id?: string
          p_unassigned?: boolean
        }
        Returns: {
          assigned_user_id: string
          assignee_avatar: string
          assignee_name: string
          created_at: string
          deal_status: string
          email: string
          id: string
          last_interaction_at: string
          last_interaction_channel: string
          last_interaction_preview: string
          lost_reason: string
          name: string
          phone: string
          pipeline_id: string
          sla_status: string
          source: string
          stage_color: string
          stage_id: string
          stage_name: string
          tags: Json
          total_count: number
        }[]
      }
      normalize_phone: { Args: { phone_input: string }; Returns: string }
      notify_financial_entries: { Args: never; Returns: undefined }
      notify_whatsapp_on_lead: {
        Args: {
          p_lead_name: string
          p_org_id: string
          p_source?: string
          p_user_id: string
        }
        Returns: undefined
      }
      pick_round_robin_for_lead: {
        Args: { p_lead_id: string }
        Returns: string
      }
      redistribute_lead_from_pool: {
        Args: { p_lead_id: string; p_reason?: string }
        Returns: Json
      }
      reorder_stages: { Args: { p_stages: Json }; Returns: undefined }
      resolve_site_domain: {
        Args: { p_domain: string }
        Returns: {
          organization_id: string
          site_config: Json
        }[]
      }
      sync_historical_commissions: { Args: never; Returns: Json }
      user_belongs_to_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      user_has_organization: { Args: never; Returns: boolean }
      user_has_permission: {
        Args: { p_permission_key: string; p_user_id?: string }
        Returns: boolean
      }
      user_has_session_access: {
        Args: { session_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
      lead_source:
        | "meta"
        | "site"
        | "manual"
        | "wordpress"
        | "whatsapp"
        | "facebook"
        | "instagram"
        | "import"
        | "google"
        | "indicacao"
        | "outros"
        | "webhook"
      round_robin_strategy: "simple" | "weighted"
      task_type:
        | "call"
        | "message"
        | "email"
        | "note"
        | "task"
        | "meeting"
        | "whatsapp"
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
      app_role: ["admin", "user", "super_admin"],
      lead_source: [
        "meta",
        "site",
        "manual",
        "wordpress",
        "whatsapp",
        "facebook",
        "instagram",
        "import",
        "google",
        "indicacao",
        "outros",
        "webhook",
      ],
      round_robin_strategy: ["simple", "weighted"],
      task_type: [
        "call",
        "message",
        "email",
        "note",
        "task",
        "meeting",
        "whatsapp",
      ],
    },
  },
} as const
