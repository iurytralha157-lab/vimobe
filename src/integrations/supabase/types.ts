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
          reason: string | null
          round_robin_id: string | null
          rule_id: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          reason?: string | null
          round_robin_id?: string | null
          rule_id?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          reason?: string | null
          round_robin_id?: string | null
          rule_id?: string | null
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
          {
            foreignKeyName: "assignments_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "round_robin_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
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
          entity_type: string
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
          entity_type?: string
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
          automation_id: string
          condition_branch: string | null
          id: string
          source_handle: string | null
          source_node_id: string
          target_node_id: string
        }
        Insert: {
          automation_id: string
          condition_branch?: string | null
          id?: string
          source_handle?: string | null
          source_node_id: string
          target_node_id: string
        }
        Update: {
          automation_id?: string
          condition_branch?: string | null
          id?: string
          source_handle?: string | null
          source_node_id?: string
          target_node_id?: string
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
            foreignKeyName: "automation_executions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
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
      automation_logs: {
        Row: {
          action_taken: string
          automation_id: string | null
          details: Json | null
          executed_at: string | null
          id: string
          lead_id: string | null
          organization_id: string
        }
        Insert: {
          action_taken: string
          automation_id?: string | null
          details?: Json | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          organization_id: string
        }
        Update: {
          action_taken?: string
          automation_id?: string | null
          details?: Json | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "stage_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_organization_id_fkey"
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
          automation_id: string
          config: Json
          created_at: string | null
          id: string
          node_type: string
          position_x: number | null
          position_y: number | null
        }
        Insert: {
          action_type?: string | null
          automation_id: string
          config?: Json
          created_at?: string | null
          id?: string
          node_type: string
          position_x?: number | null
          position_y?: number | null
        }
        Update: {
          action_type?: string | null
          automation_id?: string
          config?: Json
          created_at?: string | null
          id?: string
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
          observation: string | null
          position: number | null
          recommended_message: string | null
          title: string
          type: Database["public"]["Enums"]["task_type"]
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
          type?: Database["public"]["Enums"]["task_type"]
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
          type?: Database["public"]["Enums"]["task_type"]
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
          business_type: string
          commission_type: string
          commission_value: number
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
        }
        Insert: {
          business_type: string
          commission_type: string
          commission_value: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
        }
        Update: {
          business_type?: string
          commission_type?: string
          commission_value?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          base_value: number
          calculated_value: number
          contract_id: string | null
          created_at: string
          forecast_date: string | null
          id: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          paid_by: string | null
          payment_proof: string | null
          percentage: number | null
          property_id: string | null
          rule_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_value: number
          calculated_value: number
          contract_id?: string | null
          created_at?: string
          forecast_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          paid_by?: string | null
          payment_proof?: string | null
          percentage?: number | null
          property_id?: string | null
          rule_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_value?: number
          calculated_value?: number
          contract_id?: string | null
          created_at?: string
          forecast_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_proof?: string | null
          percentage?: number | null
          property_id?: string | null
          rule_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
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
        ]
      }
      contract_brokers: {
        Row: {
          commission_percentage: number
          commission_value: number | null
          contract_id: string
          created_at: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          commission_percentage?: number
          commission_value?: number | null
          contract_id: string
          created_at?: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          commission_percentage?: number
          commission_value?: number | null
          contract_id?: string
          created_at?: string
          id?: string
          role?: string | null
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
        Relationships: []
      }
      contracts: {
        Row: {
          client_document: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          contract_number: string
          created_at: string
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
          status: string
          total_value: number
          type: string
          updated_at: string
        }
        Insert: {
          client_document?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          contract_number: string
          created_at?: string
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
          status?: string
          total_value?: number
          type: string
          updated_at?: string
        }
        Update: {
          client_document?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          contract_number?: string
          created_at?: string
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
          status?: string
          total_value?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      financial_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          type?: string
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          attachments: Json | null
          category_id: string | null
          competence_date: string | null
          contract_id: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string
          id: string
          installment_number: number | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          paid_value: number | null
          parent_entry_id: string | null
          payment_method: string | null
          property_id: string | null
          related_person_id: string | null
          related_person_name: string | null
          related_person_type: string | null
          status: string
          total_installments: number | null
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          attachments?: Json | null
          category_id?: string | null
          competence_date?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date: string
          id?: string
          installment_number?: number | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          paid_value?: number | null
          parent_entry_id?: string | null
          payment_method?: string | null
          property_id?: string | null
          related_person_id?: string | null
          related_person_name?: string | null
          related_person_type?: string | null
          status?: string
          total_installments?: number | null
          type: string
          updated_at?: string
          value: number
        }
        Update: {
          attachments?: Json | null
          category_id?: string | null
          competence_date?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string
          id?: string
          installment_number?: number | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          paid_value?: number | null
          parent_entry_id?: string | null
          payment_method?: string | null
          property_id?: string | null
          related_person_id?: string | null
          related_person_name?: string | null
          related_person_type?: string | null
          status?: string
          total_installments?: number | null
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
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
            foreignKeyName: "financial_entries_parent_entry_id_fkey"
            columns: ["parent_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string | null
          id: string
          is_sync_enabled: boolean | null
          refresh_token: string
          token_expires_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          is_sync_enabled?: boolean | null
          refresh_token: string
          token_expires_at: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          is_sync_enabled?: boolean | null
          refresh_token?: string
          token_expires_at?: string
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
          role: Database["public"]["Enums"]["app_role"] | null
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
          role?: Database["public"]["Enums"]["app_role"] | null
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
          role?: Database["public"]["Enums"]["app_role"] | null
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
      lead_meta: {
        Row: {
          ad_id: string | null
          ad_name: string | null
          adset_id: string | null
          adset_name: string | null
          campaign_id: string | null
          campaign_name: string | null
          created_at: string
          form_id: string | null
          id: string
          lead_id: string
          page_id: string | null
          platform: string | null
          raw_payload: Json | null
        }
        Insert: {
          ad_id?: string | null
          ad_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          created_at?: string
          form_id?: string | null
          id?: string
          lead_id: string
          page_id?: string | null
          platform?: string | null
          raw_payload?: Json | null
        }
        Update: {
          ad_id?: string | null
          ad_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          created_at?: string
          form_id?: string | null
          id?: string
          lead_id?: string
          page_id?: string | null
          platform?: string | null
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
          type: Database["public"]["Enums"]["task_type"]
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
          type?: Database["public"]["Enums"]["task_type"]
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
          type?: Database["public"]["Enums"]["task_type"]
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
          actor_user_id: string | null
          channel: string | null
          created_at: string
          event_at: string
          event_type: string
          id: string
          is_automation: boolean | null
          lead_id: string
          metadata: Json | null
          organization_id: string
        }
        Insert: {
          actor_user_id?: string | null
          channel?: string | null
          created_at?: string
          event_at?: string
          event_type: string
          id?: string
          is_automation?: boolean | null
          lead_id: string
          metadata?: Json | null
          organization_id: string
        }
        Update: {
          actor_user_id?: string | null
          channel?: string | null
          created_at?: string
          event_at?: string
          event_type?: string
          id?: string
          is_automation?: boolean | null
          lead_id?: string
          metadata?: Json | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_timeline_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
        ]
      }
      leads: {
        Row: {
          assigned_at: string | null
          assigned_user_id: string | null
          bairro: string | null
          campaign_name: string | null
          cargo: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string
          custom_fields: Json | null
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
          renda_familiar: string | null
          sla_last_checked_at: string | null
          sla_notified_overdue_at: string | null
          sla_notified_warning_at: string | null
          sla_seconds_elapsed: number | null
          sla_status: string | null
          source: Database["public"]["Enums"]["lead_source"]
          source_detail: string | null
          stage_entered_at: string | null
          stage_id: string | null
          trabalha: boolean | null
          uf: string | null
          updated_at: string
          valor_interesse: number | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_user_id?: string | null
          bairro?: string | null
          campaign_name?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          custom_fields?: Json | null
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
          renda_familiar?: string | null
          sla_last_checked_at?: string | null
          sla_notified_overdue_at?: string | null
          sla_notified_warning_at?: string | null
          sla_seconds_elapsed?: number | null
          sla_status?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          source_detail?: string | null
          stage_entered_at?: string | null
          stage_id?: string | null
          trabalha?: boolean | null
          uf?: string | null
          updated_at?: string
          valor_interesse?: number | null
        }
        Update: {
          assigned_at?: string | null
          assigned_user_id?: string | null
          bairro?: string | null
          campaign_name?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          custom_fields?: Json | null
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
          renda_familiar?: string | null
          sla_last_checked_at?: string | null
          sla_notified_overdue_at?: string | null
          sla_notified_warning_at?: string | null
          sla_seconds_elapsed?: number | null
          sla_status?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          source_detail?: string | null
          stage_entered_at?: string | null
          stage_id?: string | null
          trabalha?: boolean | null
          uf?: string | null
          updated_at?: string
          valor_interesse?: number | null
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
      media_jobs: {
        Row: {
          attempts: number
          conversation_id: string
          created_at: string
          error_message: string | null
          id: string
          max_attempts: number
          media_mime_type: string | null
          media_type: string
          message_id: string
          message_key: Json | null
          next_retry_at: string
          organization_id: string
          remote_jid: string | null
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          conversation_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number
          media_mime_type?: string | null
          media_type: string
          message_id: string
          message_key?: Json | null
          next_retry_at?: string
          organization_id: string
          remote_jid?: string | null
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          conversation_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number
          media_mime_type?: string | null
          media_type?: string
          message_id?: string
          message_key?: Json | null
          next_retry_at?: string
          organization_id?: string
          remote_jid?: string | null
          session_id?: string
          status?: string
          updated_at?: string
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
      meta_form_configs: {
        Row: {
          assigned_team_id: string | null
          assigned_user_id: string | null
          auto_tags: Json | null
          created_at: string | null
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
          updated_at: string | null
        }
        Insert: {
          assigned_team_id?: string | null
          assigned_user_id?: string | null
          auto_tags?: Json | null
          created_at?: string | null
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
          updated_at?: string | null
        }
        Update: {
          assigned_team_id?: string | null
          assigned_user_id?: string | null
          auto_tags?: Json | null
          created_at?: string | null
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
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_form_configs_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "meta_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
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
        ]
      }
      organization_modules: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          module_name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          module_name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          module_name?: string
          organization_id?: string
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
          admin_notes: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          inscricao_estadual: string | null
          is_active: boolean | null
          last_access_at: string | null
          logo_size: number | null
          logo_url: string | null
          max_users: number | null
          name: string
          nome_fantasia: string | null
          numero: string | null
          razao_social: string | null
          segment: string | null
          subscription_status: string | null
          telefone: string | null
          theme_mode: string | null
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
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          is_active?: boolean | null
          last_access_at?: string | null
          logo_size?: number | null
          logo_url?: string | null
          max_users?: number | null
          name: string
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string | null
          segment?: string | null
          subscription_status?: string | null
          telefone?: string | null
          theme_mode?: string | null
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
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          is_active?: boolean | null
          last_access_at?: string | null
          logo_size?: number | null
          logo_url?: string | null
          max_users?: number | null
          name?: string
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string | null
          segment?: string | null
          subscription_status?: string | null
          telefone?: string | null
          theme_mode?: string | null
          uf?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      outbox_messages: {
        Row: {
          attempts: number | null
          content: string
          conversation_id: string
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          max_attempts: number | null
          media_base64: string | null
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          message_type: string | null
          organization_id: string
          processed_at: string | null
          sent_message_id: string | null
          session_id: string
          status: string | null
        }
        Insert: {
          attempts?: number | null
          content: string
          conversation_id: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          media_base64?: string | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string | null
          organization_id: string
          processed_at?: string | null
          sent_message_id?: string | null
          session_id: string
          status?: string | null
        }
        Update: {
          attempts?: number | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          media_base64?: string | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string | null
          organization_id?: string
          processed_at?: string | null
          sent_message_id?: string | null
          session_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbox_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbox_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbox_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbox_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
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
          first_response_target_seconds: number | null
          id: string
          is_active: boolean | null
          notify_assignee: boolean | null
          notify_manager: boolean | null
          organization_id: string
          overdue_after_seconds: number | null
          pipeline_id: string
          updated_at: string | null
          warn_after_seconds: number | null
        }
        Insert: {
          created_at?: string | null
          first_response_target_seconds?: number | null
          id?: string
          is_active?: boolean | null
          notify_assignee?: boolean | null
          notify_manager?: boolean | null
          organization_id: string
          overdue_after_seconds?: number | null
          pipeline_id: string
          updated_at?: string | null
          warn_after_seconds?: number | null
        }
        Update: {
          created_at?: string | null
          first_response_target_seconds?: number | null
          id?: string
          is_active?: boolean | null
          notify_assignee?: boolean | null
          notify_manager?: boolean | null
          organization_id?: string
          overdue_after_seconds?: number | null
          pipeline_id?: string
          updated_at?: string | null
          warn_after_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_sla_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_sla_settings_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: true
            referencedRelation: "pipelines"
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
          code: string
          complemento: string | null
          condominio: number | null
          created_at: string
          descricao: string | null
          destaque: boolean | null
          detalhes_extras: Json | null
          endereco: string | null
          fotos: Json | null
          id: string
          imagem_principal: string | null
          iptu: number | null
          mobilia: string | null
          numero: string | null
          organization_id: string
          preco: number | null
          proximidades: Json | null
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
          detalhes_extras?: Json | null
          endereco?: string | null
          fotos?: Json | null
          id?: string
          imagem_principal?: string | null
          iptu?: number | null
          mobilia?: string | null
          numero?: string | null
          organization_id: string
          preco?: number | null
          proximidades?: Json | null
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
          detalhes_extras?: Json | null
          endereco?: string | null
          fotos?: Json | null
          id?: string
          imagem_principal?: string | null
          iptu?: number | null
          mobilia?: string | null
          numero?: string | null
          organization_id?: string
          preco?: number | null
          proximidades?: Json | null
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
          category: string | null
          created_at: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
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
      round_robin_members: {
        Row: {
          id: string
          leads_count: number | null
          position: number
          round_robin_id: string
          team_id: string | null
          user_id: string | null
          weight: number | null
        }
        Insert: {
          id?: string
          leads_count?: number | null
          position?: number
          round_robin_id: string
          team_id?: string | null
          user_id?: string | null
          weight?: number | null
        }
        Update: {
          id?: string
          leads_count?: number | null
          position?: number
          round_robin_id?: string
          team_id?: string | null
          user_id?: string | null
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
          name: string | null
          organization_id: string | null
          priority: number | null
          round_robin_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          match?: Json | null
          match_type: string
          match_value: string
          name?: string | null
          organization_id?: string | null
          priority?: number | null
          round_robin_id: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          match?: Json | null
          match_type?: string
          match_value?: string
          name?: string | null
          organization_id?: string | null
          priority?: number | null
          round_robin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_robin_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          strategy: Database["public"]["Enums"]["round_robin_strategy"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_assigned_index?: number | null
          name: string
          organization_id: string
          strategy?: Database["public"]["Enums"]["round_robin_strategy"]
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_assigned_index?: number | null
          name?: string
          organization_id?: string
          strategy?: Database["public"]["Enums"]["round_robin_strategy"]
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
          all_day: boolean | null
          cadence_task_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          end_at: string | null
          event_type: string
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          is_completed: boolean | null
          lead_id: string | null
          organization_id: string
          reminder_5min_sent: boolean | null
          reminder_sent: boolean | null
          source: string | null
          start_at: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          cadence_task_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_at?: string | null
          event_type: string
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          is_completed?: boolean | null
          lead_id?: string | null
          organization_id: string
          reminder_5min_sent?: boolean | null
          reminder_sent?: boolean | null
          source?: string | null
          start_at: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          cadence_task_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_at?: string | null
          event_type?: string
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          is_completed?: boolean | null
          lead_id?: string | null
          organization_id?: string
          reminder_5min_sent?: boolean | null
          reminder_sent?: boolean | null
          source?: string | null
          start_at?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_cadence_task_id_fkey"
            columns: ["cadence_task_id"]
            isOneToOne: false
            referencedRelation: "lead_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          alert_message: string | null
          automation_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          stage_id: string
          target_stage_id: string | null
          trigger_days: number | null
          updated_at: string | null
          whatsapp_template: string | null
        }
        Insert: {
          alert_message?: string | null
          automation_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          stage_id: string
          target_stage_id?: string | null
          trigger_days?: number | null
          updated_at?: string | null
          whatsapp_template?: string | null
        }
        Update: {
          alert_message?: string | null
          automation_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          stage_id?: string
          target_stage_id?: string | null
          trigger_days?: number | null
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
      super_admin_sessions: {
        Row: {
          ended_at: string | null
          id: string
          impersonating_org_id: string | null
          is_active: boolean | null
          started_at: string | null
          super_admin_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          impersonating_org_id?: string | null
          is_active?: boolean | null
          started_at?: string | null
          super_admin_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          impersonating_org_id?: string | null
          is_active?: boolean | null
          started_at?: string | null
          super_admin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_sessions_impersonating_org_id_fkey"
            columns: ["impersonating_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          default_whatsapp: string | null
          id: string
          logo_height: number | null
          logo_url_dark: string | null
          logo_url_light: string | null
          logo_width: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_whatsapp?: string | null
          id?: string
          logo_height?: number | null
          logo_url_dark?: string | null
          logo_url_light?: string | null
          logo_width?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_whatsapp?: string | null
          id?: string
          logo_height?: number | null
          logo_url_dark?: string | null
          logo_url_light?: string | null
          logo_width?: number | null
          updated_at?: string
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
      telephony_calls: {
        Row: {
          answered_at: string | null
          created_at: string
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          external_call_id: string | null
          external_session_id: string | null
          id: string
          initiated_at: string
          lead_id: string | null
          metadata: Json | null
          notes: string | null
          organization_id: string
          outcome: string | null
          phone_from: string | null
          phone_to: string | null
          recording_duration_sec: number | null
          recording_error: string | null
          recording_expires_at: string | null
          recording_status: string | null
          recording_storage_path: string | null
          recording_url: string | null
          status: string
          talk_time_seconds: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          answered_at?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          external_call_id?: string | null
          external_session_id?: string | null
          id?: string
          initiated_at?: string
          lead_id?: string | null
          metadata?: Json | null
          notes?: string | null
          organization_id: string
          outcome?: string | null
          phone_from?: string | null
          phone_to?: string | null
          recording_duration_sec?: number | null
          recording_error?: string | null
          recording_expires_at?: string | null
          recording_status?: string | null
          recording_storage_path?: string | null
          recording_url?: string | null
          status?: string
          talk_time_seconds?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          answered_at?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          external_call_id?: string | null
          external_session_id?: string | null
          id?: string
          initiated_at?: string
          lead_id?: string | null
          metadata?: Json | null
          notes?: string | null
          organization_id?: string
          outcome?: string | null
          phone_from?: string | null
          phone_to?: string | null
          recording_duration_sec?: number | null
          recording_error?: string | null
          recording_expires_at?: string | null
          recording_status?: string | null
          recording_storage_path?: string | null
          recording_url?: string | null
          status?: string
          talk_time_seconds?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telephony_calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telephony_calls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telephony_calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      telephony_recording_audit: {
        Row: {
          action: string
          call_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          call_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          call_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telephony_recording_audit_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "telephony_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telephony_recording_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telephony_recording_audit_user_id_fkey"
            columns: ["user_id"]
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
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
          role?: Database["public"]["Enums"]["app_role"]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      webhooks_integrations: {
        Row: {
          api_token: string
          created_at: string
          field_mapping: Json | null
          id: string
          is_active: boolean | null
          last_lead_at: string | null
          last_triggered_at: string | null
          leads_received: number | null
          name: string
          organization_id: string
          target_pipeline_id: string | null
          target_property_id: string | null
          target_stage_id: string | null
          target_tag_ids: string[]
          target_team_id: string | null
          trigger_events: string[] | null
          type: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_token?: string
          created_at?: string
          field_mapping?: Json | null
          id?: string
          is_active?: boolean | null
          last_lead_at?: string | null
          last_triggered_at?: string | null
          leads_received?: number | null
          name: string
          organization_id: string
          target_pipeline_id?: string | null
          target_property_id?: string | null
          target_stage_id?: string | null
          target_tag_ids?: string[]
          target_team_id?: string | null
          trigger_events?: string[] | null
          type?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_token?: string
          created_at?: string
          field_mapping?: Json | null
          id?: string
          is_active?: boolean | null
          last_lead_at?: string | null
          last_triggered_at?: string | null
          leads_received?: number | null
          name?: string
          organization_id?: string
          target_pipeline_id?: string | null
          target_property_id?: string | null
          target_stage_id?: string | null
          target_tag_ids?: string[]
          target_team_id?: string | null
          trigger_events?: string[] | null
          type?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
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
          client_message_id: string | null
          content: string | null
          conversation_id: string
          delivered_at: string | null
          from_me: boolean
          id: string
          media_error: string | null
          media_mime_type: string | null
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
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wpp_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          session_id: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          session_id?: string | null
          token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          session_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "wpp_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_org_id: { Args: never; Returns: string }
      check_rule_match: {
        Args: {
          p_lead: Record<string, unknown>
          p_lead_tags: string[]
          p_match: Json
        }
        Returns: boolean
      }
      create_default_stages_for_pipeline: {
        Args: { p_org_id: string; p_pipeline_id: string }
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_content?: string
          p_lead_id?: string
          p_organization_id: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      get_dashboard_stats: { Args: never; Returns: Json }
      get_funnel_data: { Args: never; Returns: Json }
      get_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_lead_sources_data: { Args: never; Returns: Json }
      get_led_team_member_ids: { Args: never; Returns: string[] }
      get_sla_pending_leads: {
        Args: never
        Returns: {
          assigned_user_id: string
          current_sla_status: string
          lead_id: string
          lead_name: string
          notify_assignee: boolean
          notify_manager: boolean
          organization_id: string
          overdue_after_seconds: number
          pipeline_id: string
          sla_notified_overdue_at: string
          sla_notified_warning_at: string
          sla_start_at: string
          warn_after_seconds: number
        }[]
      }
      get_sla_performance_by_user: {
        Args: {
          p_end_date?: string
          p_organization_id: string
          p_pipeline_id?: string
          p_start_date?: string
        }
        Returns: {
          avg_first_touch_seconds: number
          avg_response_seconds: number
          overdue_count: number
          pending_response: number
          responded_in_time: number
          responded_late: number
          sla_compliance_rate: number
          total_leads: number
          user_id: string
          user_name: string
        }[]
      }
      get_sla_start_at: { Args: { p_lead_id: string }; Returns: string }
      get_user_led_team_ids: { Args: never; Returns: string[] }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_team_ids: { Args: never; Returns: string[] }
      handle_lead_intake: { Args: { p_lead_id: string }; Returns: Json }
      has_module: { Args: { _module: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_org_admin: { Args: { _org_id?: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_team_leader: { Args: never; Returns: boolean }
      list_contacts_paginated: {
        Args: {
          p_assignee_id?: string
          p_created_from?: string
          p_created_to?: string
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
          email: string
          id: string
          last_interaction_at: string
          last_interaction_channel: string
          last_interaction_preview: string
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
      log_audit: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type?: string
          p_ip_address?: string
          p_new_data?: Json
          p_old_data?: Json
          p_user_agent?: string
        }
        Returns: string
      }
      normalize_phone: { Args: { phone: string }; Returns: string }
      pick_round_robin_for_lead: {
        Args: { p_lead_id: string }
        Returns: {
          round_robin_id: string
          rule_id: string
        }[]
      }
      session_in_user_org: { Args: { p_session_id: string }; Returns: boolean }
      simulate_round_robin: {
        Args: {
          p_campaign_name?: string
          p_city?: string
          p_meta_form_id?: string
          p_organization_id: string
          p_pipeline_id?: string
          p_source?: string
          p_tags?: string[]
        }
        Returns: Json
      }
      user_has_organization: { Args: never; Returns: boolean }
      user_has_session_access: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      user_owns_session: { Args: { p_session_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
      lead_source:
        | "meta"
        | "site"
        | "manual"
        | "wordpress"
        | "facebook"
        | "instagram"
        | "import"
        | "google"
        | "indicacao"
        | "whatsapp"
        | "outros"
        | "webhook"
      round_robin_strategy: "simple" | "weighted"
      task_type:
        | "call"
        | "message"
        | "email"
        | "note"
        | "whatsapp"
        | "task"
        | "meeting"
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
        "facebook",
        "instagram",
        "import",
        "google",
        "indicacao",
        "whatsapp",
        "outros",
        "webhook",
      ],
      round_robin_strategy: ["simple", "weighted"],
      task_type: [
        "call",
        "message",
        "email",
        "note",
        "whatsapp",
        "task",
        "meeting",
      ],
    },
  },
} as const
