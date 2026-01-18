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
      assignments_log: {
        Row: {
          assigned_user_id: string | null
          created_at: string
          id: string
          lead_id: string
          round_robin_id: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          round_robin_id?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          round_robin_id?: string | null
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
            foreignKeyName: "assignments_log_round_robin_id_fkey"
            columns: ["round_robin_id"]
            isOneToOne: false
            referencedRelation: "round_robins"
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
      automation_nodes: {
        Row: {
          automation_id: string | null
          created_at: string | null
          id: string
          node_config: Json | null
          node_type: string
          position_x: number | null
          position_y: number | null
        }
        Insert: {
          automation_id?: string | null
          created_at?: string | null
          id?: string
          node_config?: Json | null
          node_type: string
          position_x?: number | null
          position_y?: number | null
        }
        Update: {
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
      automations: {
        Row: {
          created_at: string | null
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
      cadence_tasks_template: {
        Row: {
          cadence_template_id: string
          day_offset: number
          description: string | null
          id: string
          position: number | null
          title: string
        }
        Insert: {
          cadence_template_id: string
          day_offset?: number
          description?: string | null
          id?: string
          position?: number | null
          title: string
        }
        Update: {
          cadence_template_id?: string
          day_offset?: number
          description?: string | null
          id?: string
          position?: number | null
          title?: string
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
      commissions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          percentage: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          percentage?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          percentage?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
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
            foreignKeyName: "commissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          attachments: Json | null
          closing_date: string | null
          commission_percentage: number | null
          commission_value: number | null
          contract_number: string | null
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          id: string
          lead_id: string | null
          notes: string | null
          organization_id: string
          property_id: string | null
          signing_date: string | null
          status: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          attachments?: Json | null
          closing_date?: string | null
          commission_percentage?: number | null
          commission_value?: number | null
          contract_number?: string | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          organization_id: string
          property_id?: string | null
          signing_date?: string | null
          status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          attachments?: Json | null
          closing_date?: string | null
          commission_percentage?: number | null
          commission_value?: number | null
          contract_number?: string | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          organization_id?: string
          property_id?: string | null
          signing_date?: string | null
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
          lead_id: string | null
          notes: string | null
          organization_id: string
          paid_date: string | null
          payment_method: string | null
          status: string | null
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
          lead_id?: string | null
          notes?: string | null
          organization_id: string
          paid_date?: string | null
          payment_method?: string | null
          status?: string | null
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
          lead_id?: string | null
          notes?: string | null
          organization_id?: string
          paid_date?: string | null
          payment_method?: string | null
          status?: string | null
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
      invitations: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          expires_at: string
          id: string
          organization_id: string
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
          adset_id: string | null
          campaign_id: string | null
          created_at: string
          form_id: string | null
          id: string
          lead_id: string
          page_id: string | null
          raw_payload: Json | null
        }
        Insert: {
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          created_at?: string
          form_id?: string | null
          id?: string
          lead_id: string
          page_id?: string | null
          raw_payload?: Json | null
        }
        Update: {
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          created_at?: string
          form_id?: string | null
          id?: string
          lead_id?: string
          page_id?: string | null
          raw_payload?: Json | null
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
          title: string
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
          title: string
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
          title?: string
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
          assigned_user_id: string | null
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          organization_id: string
          phone: string | null
          pipeline_id: string | null
          property_code: string | null
          property_id: string | null
          stage_entered_at: string | null
          stage_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          organization_id: string
          phone?: string | null
          pipeline_id?: string | null
          property_code?: string | null
          property_id?: string | null
          stage_entered_at?: string | null
          stage_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          pipeline_id?: string | null
          property_code?: string | null
          property_id?: string | null
          stage_entered_at?: string | null
          stage_id?: string | null
          updated_at?: string
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
            foreignKeyName: "leads_stage_id_fkey"
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
          campaign_property_mapping: Json | null
          created_at: string
          field_mapping: Json | null
          form_ids: Json | null
          id: string
          is_connected: boolean | null
          last_error: string | null
          last_sync_at: string | null
          organization_id: string
          page_id: string | null
          page_name: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          campaign_property_mapping?: Json | null
          created_at?: string
          field_mapping?: Json | null
          form_ids?: Json | null
          id?: string
          is_connected?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          organization_id: string
          page_id?: string | null
          page_name?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          campaign_property_mapping?: Json | null
          created_at?: string
          field_mapping?: Json | null
          form_ids?: Json | null
          id?: string
          is_connected?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          organization_id?: string
          page_id?: string | null
          page_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      organizations: {
        Row: {
          accent_color: string | null
          created_at: string
          created_by: string | null
          id: string
          logo_size: number | null
          logo_url: string | null
          name: string
          segment: string | null
          theme_mode: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_size?: number | null
          logo_url?: string | null
          name: string
          segment?: string | null
          theme_mode?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_size?: number | null
          logo_url?: string | null
          name?: string
          segment?: string | null
          theme_mode?: string | null
          updated_at?: string
        }
        Relationships: []
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
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
        }
        Relationships: [
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
          code: string
          complemento: string | null
          condominio: number | null
          created_at: string
          descricao: string | null
          destaque: boolean | null
          endereco: string | null
          fotos: Json | null
          id: string
          imagem_principal: string | null
          iptu: number | null
          mobilia: string | null
          numero: string | null
          organization_id: string
          preco: number | null
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
          code: string
          complemento?: string | null
          condominio?: number | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean | null
          endereco?: string | null
          fotos?: Json | null
          id?: string
          imagem_principal?: string | null
          iptu?: number | null
          mobilia?: string | null
          numero?: string | null
          organization_id: string
          preco?: number | null
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
          code?: string
          complemento?: string | null
          condominio?: number | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean | null
          endereco?: string | null
          fotos?: Json | null
          id?: string
          imagem_principal?: string | null
          iptu?: number | null
          mobilia?: string | null
          numero?: string | null
          organization_id?: string
          preco?: number | null
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
            foreignKeyName: "properties_organization_id_fkey"
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
          position: number
          round_robin_id: string
          team_id: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          id?: string
          position?: number
          round_robin_id: string
          team_id?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          id?: string
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
          match_type: string
          match_value: string
          round_robin_id: string
        }
        Insert: {
          id?: string
          match_type: string
          match_value: string
          round_robin_id: string
        }
        Update: {
          id?: string
          match_type?: string
          match_value?: string
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
          created_at: string
          id: string
          is_active: boolean | null
          last_assigned_index: number | null
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_assigned_index?: number | null
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_assigned_index?: number | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_robins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      stage_automations: {
        Row: {
          action_config: Json | null
          action_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          stage_id: string | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          stage_id?: string | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          stage_id?: string | null
          trigger_type?: string
          updated_at?: string | null
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
          user_id: string
        }
        Insert: {
          id?: string
          user_id: string
        }
        Update: {
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          role?: string | null
          updated_at?: string
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
      whatsapp_conversations: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          contact_picture: string | null
          created_at: string
          id: string
          is_group: boolean | null
          last_message: string | null
          last_message_at: string | null
          lead_id: string | null
          remote_jid: string
          session_id: string
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          contact_phone?: string | null
          contact_picture?: string | null
          created_at?: string
          id?: string
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          remote_jid: string
          session_id: string
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string | null
          contact_picture?: string | null
          created_at?: string
          id?: string
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
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
            foreignKeyName: "whatsapp_conversations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          conversation_id: string
          delivered_at: string | null
          from_me: boolean
          id: string
          media_mime_type: string | null
          media_url: string | null
          message_id: string
          message_type: string | null
          read_at: string | null
          sent_at: string
          session_id: string
          status: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          delivered_at?: string | null
          from_me?: boolean
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          message_id: string
          message_type?: string | null
          read_at?: string | null
          sent_at?: string
          session_id: string
          status?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          delivered_at?: string | null
          from_me?: boolean
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          message_id?: string
          message_type?: string | null
          read_at?: string | null
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
          id: string
          instance_id: string | null
          instance_name: string
          is_active: boolean | null
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
          id?: string
          instance_id?: string | null
          instance_name: string
          is_active?: boolean | null
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
          id?: string
          instance_id?: string | null
          instance_name?: string
          is_active?: boolean | null
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
      wordpress_integrations: {
        Row: {
          api_token: string
          created_at: string
          id: string
          is_active: boolean | null
          last_lead_at: string | null
          leads_received: number | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          api_token?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_lead_at?: string | null
          leads_received?: number | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          api_token?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_lead_at?: string | null
          leads_received?: number | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      create_notification: {
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
      get_user_led_team_ids: { Args: never; Returns: string[] }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_team_ids: { Args: never; Returns: string[] }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_team_leader:
        | { Args: never; Returns: boolean }
        | { Args: { check_user_id?: string }; Returns: boolean }
      normalize_phone: { Args: { phone_input: string }; Returns: string }
      user_belongs_to_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      user_has_organization: { Args: never; Returns: boolean }
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
