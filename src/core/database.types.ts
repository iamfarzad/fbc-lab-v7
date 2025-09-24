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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  admin: {
    Tables: {
      admin_conversations: {
        Row: {
          admin_id: string
          context_leads: string[] | null
          conversation_id: string
          created_at: string
          embeddings: string
          id: string
          message_content: string
          message_type: Database["admin"]["Enums"]["message_type_enum"]
          session_id: string
        }
        Insert: {
          admin_id: string
          context_leads?: string[] | null
          conversation_id: string
          created_at?: string
          embeddings: string
          id?: string
          message_content: string
          message_type: Database["admin"]["Enums"]["message_type_enum"]
          session_id: string
        }
        Update: {
          admin_id?: string
          context_leads?: string[] | null
          conversation_id?: string
          created_at?: string
          embeddings?: string
          id?: string
          message_content?: string
          message_type?: Database["admin"]["Enums"]["message_type_enum"]
          session_id?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          admin_id: string
          context_summary: string | null
          id: string
          is_active: boolean
          last_activity: string
          session_name: string
        }
        Insert: {
          admin_id: string
          context_summary?: string | null
          id?: string
          is_active?: boolean
          last_activity?: string
          session_name: string
        }
        Update: {
          admin_id?: string
          context_summary?: string | null
          id?: string
          is_active?: boolean
          last_activity?: string
          session_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      http: {
        Args: { request: Database["admin"]["CompositeTypes"]["http_request"] }
        Returns: Database["admin"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { uri: string }
        Returns: Database["admin"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { data: Json; uri: string } | { uri: string }
        Returns: Database["admin"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["admin"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["admin"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["admin"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { data: Json; uri: string }
        Returns: Database["admin"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["admin"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      search_admin_conversations: {
        Args: {
          p_limit?: number
          p_query: string
          p_session_id: string
          p_thresh?: number
        }
        Returns: {
          admin_id: string
          context_leads: string[]
          conversation_id: string
          created_at: string
          distance: number
          embeddings: string
          id: string
          message_content: string
          message_type: Database["admin"]["Enums"]["message_type_enum"]
          session_id: string
        }[]
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      urlencode: {
        Args: { data: Json } | { string: string }  
        Returns: string
      }
    }
    Enums: {
      message_type_enum: "user" | "assistant" | "system"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["admin"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["admin"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          status: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      ai_responses: {
        Row: {
          activity_id: string | null
          audio_data: string | null
          created_at: string | null
          id: string
          image_data: string | null
          response_type: string
          session_id: string
          text: string | null
          tools_used: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activity_id?: string | null
          audio_data?: string | null
          created_at?: string | null
          id?: string
          image_data?: string | null
          response_type: string
          session_id: string
          text?: string | null
          tools_used?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activity_id?: string | null
          audio_data?: string | null
          created_at?: string | null
          id?: string
          image_data?: string | null
          response_type?: string
          session_id?: string
          text?: string | null
          tools_used?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_responses_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string | null
          metadata: Json
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id?: string | null
          metadata?: Json
          type: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          metadata?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_usage: {
        Row: {
          capability_name: string | null
          created_at: string | null
          id: string
          session_id: string | null
          usage_count: number | null
          usage_data: Json | null
        }
        Insert: {
          capability_name?: string | null
          created_at?: string | null
          id?: string
          session_id?: string | null
          usage_count?: number | null
          usage_data?: Json | null
        }
        Update: {
          capability_name?: string | null
          created_at?: string | null
          id?: string
          session_id?: string | null
          usage_count?: number | null
          usage_data?: Json | null
        }
        Relationships: []
      }
      capability_usage_log: {
        Row: {
          capability: string
          context: Json | null
          first_used_at: string | null
          id: number
          session_id: string
        }
        Insert: {
          capability: string
          context?: Json | null
          first_used_at?: string | null
          id?: never
          session_id: string
        }
        Update: {
          capability?: string
          context?: Json | null
          first_used_at?: string | null
          id?: never
          session_id?: string
        }
        Relationships: []
      }
      conversation_contexts: {
        Row: {
          ai_capabilities_shown: string[] | null
          company_context: Json | null
          company_url: string | null
          created_at: string | null
          email: string
          intent_data: Json | null
          last_user_message: string | null
          name: string | null
          person_context: Json | null
          role: string | null
          role_confidence: number | null
          session_id: string
          updated_at: string | null
        }
        Insert: {
          ai_capabilities_shown?: string[] | null
          company_context?: Json | null
          company_url?: string | null
          created_at?: string | null
          email: string
          intent_data?: Json | null
          last_user_message?: string | null
          name?: string | null
          person_context?: Json | null
          role?: string | null
          role_confidence?: number | null
          session_id: string
          updated_at?: string | null
        }
        Update: {
          ai_capabilities_shown?: string[] | null
          company_context?: Json | null
          company_url?: string | null
          created_at?: string | null
          email?: string
          intent_data?: Json | null
          last_user_message?: string | null
          name?: string | null
          person_context?: Json | null
          role?: string | null
          role_confidence?: number | null
          session_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversation_insights: {
        Row: {
          confidence_score: number | null
          conversation_id: string | null
          created_at: string | null
          extracted_at: string | null
          id: string
          insight_text: string
          insight_type: string
          lead_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string | null
          extracted_at?: string | null
          id?: string
          insight_text: string
          insight_type: string
          lead_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string | null
          extracted_at?: string | null
          id?: string
          insight_text?: string
          insight_type?: string
          lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_insights_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_insights_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          email_retries: number | null
          email_status: string | null
          ended_at: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          session_id: string
          stage: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_retries?: number | null
          email_status?: string | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          session_id: string
          stage?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_retries?: number | null
          email_status?: string | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          session_id?: string
          stage?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_embeddings: {
        Row: {
          created_at: string | null
          embedding: string
          id: string
          kind: string
          session_id: string
          text: string
        }
        Insert: {
          created_at?: string | null
          embedding: string
          id?: string
          kind: string
          session_id: string
          text: string
        }
        Update: {
          created_at?: string | null
          embedding?: string
          id?: string
          kind?: string
          session_id?: string
          text?: string
        }
        Relationships: []
      }
      failed_emails: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          email: string
          failure_reason: string | null
          id: string
          pdf_url: string | null
          retries: number
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          pdf_url?: string | null
          retries?: number
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          pdf_url?: string | null
          retries?: number
        }
        Relationships: [
          {
            foreignKeyName: "failed_emails_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_tasks: {
        Row: {
          completed_at: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          scheduled_for: string
          status: string
          task_data: Json | null
          task_type: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          scheduled_for: string
          status?: string
          task_data?: Json | null
          task_type: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          scheduled_for?: string
          status?: string
          task_data?: Json | null
          task_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_tasks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_classifications: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          intent: string | null
          session_id: string | null
          slots: Json | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          intent?: string | null
          session_id?: string | null
          slots?: Json | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          intent?: string | null
          session_id?: string | null
          slots?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "intent_classifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_contexts"
            referencedColumns: ["session_id"]
          },
        ]
      }
      lead_search_results: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string | null
          raw: Json | null
          snippet: string | null
          source: string
          title: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          raw?: Json | null
          snippet?: string | null
          source: string
          title?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          raw?: Json | null
          snippet?: string | null
          source?: string
          title?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_search_results_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_summaries: {
        Row: {
          company_name: string
          consultant_brief: string | null
          conversation_summary: string | null
          created_at: string | null
          email: string | null
          id: string
          intent_type: string | null
          lead_score: number | null
          summary: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_name: string
          consultant_brief?: string | null
          conversation_summary?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          intent_type?: string | null
          lead_score?: number | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_name?: string
          consultant_brief?: string | null
          conversation_summary?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          intent_type?: string | null
          lead_score?: number | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          challenges: string | null
          company: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          interests: string | null
          last_name: string | null
          lead_score: number | null
          name: string
          role: string | null
          session_summary: string | null
          source: string | null
          status: string | null
          tc_acceptance: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          challenges?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          interests?: string | null
          last_name?: string | null
          lead_score?: number | null
          name?: string
          role?: string | null
          session_summary?: string | null
          source?: string | null
          status?: string | null
          tc_acceptance?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          challenges?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          interests?: string | null
          last_name?: string | null
          lead_score?: number | null
          name?: string
          role?: string | null
          session_summary?: string | null
          source?: string | null
          status?: string | null
          tc_acceptance?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          attendees: Json | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          lead_id: string | null
          location: string | null
          meeting_date: string
          meeting_time: string
          meeting_type: string | null
          meeting_url: string | null
          metadata: Json | null
          notes: string | null
          status: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attendees?: Json | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          location?: string | null
          meeting_date: string
          meeting_time: string
          meeting_type?: string | null
          meeting_url?: string | null
          metadata?: Json | null
          notes?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attendees?: Json | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          location?: string | null
          meeting_date?: string
          meeting_time?: string
          meeting_type?: string | null
          meeting_url?: string | null
          metadata?: Json | null
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      token_usage_logs: {
        Row: {
          created_at: string | null
          endpoint: string
          error_message: string | null
          estimated_cost: number
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          session_id: string | null
          success: boolean
          task_type: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          estimated_cost?: number
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          session_id?: string | null
          success?: boolean
          task_type?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          estimated_cost?: number
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          session_id?: string | null
          success?: boolean
          task_type?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          message_type: string
          metadata: Json | null
          role: string
          search_vector: unknown | null
          timestamp: string | null
          tool_name: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          message_type: string
          metadata?: Json | null
          role: string
          search_vector?: unknown | null
          timestamp?: string | null
          tool_name?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          message_type?: string
          metadata?: Json | null
          role?: string
          search_vector?: unknown | null
          timestamp?: string | null
          tool_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcripts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_budgets: {
        Row: {
          created_at: string | null
          daily_limit: number
          id: string
          monthly_limit: number
          per_request_limit: number
          updated_at: string | null
          user_id: string | null
          user_plan: string
        }
        Insert: {
          created_at?: string | null
          daily_limit?: number
          id?: string
          monthly_limit?: number
          per_request_limit?: number
          updated_at?: string | null
          user_id?: string | null
          user_plan?: string
        }
        Update: {
          created_at?: string | null
          daily_limit?: number
          id?: string
          monthly_limit?: number
          per_request_limit?: number
          updated_at?: string | null
          user_id?: string | null
          user_plan?: string
        }
        Relationships: []
      }
      voice_sessions: {
        Row: {
          audio_chunks_received: number | null
          audio_chunks_sent: number | null
          conversation_id: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          session_id: string
          started_at: string | null
          status: string
          total_audio_bytes: number | null
          websocket_connection_id: string | null
        }
        Insert: {
          audio_chunks_received?: number | null
          audio_chunks_sent?: number | null
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          session_id: string
          started_at?: string | null
          status?: string
          total_audio_bytes?: number | null
          websocket_connection_id?: string | null
        }
        Update: {
          audio_chunks_received?: number | null
          audio_chunks_sent?: number | null
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          session_id?: string
          started_at?: string | null
          status?: string
          total_audio_bytes?: number | null
          websocket_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_conversations: {
        Row: {
          admin_id: string | null
          context_leads: string[] | null
          conversation_id: string | null
          created_at: string | null
          embeddings: string | null
          id: string | null
          message_content: string | null
          message_type: Database["admin"]["Enums"]["message_type_enum"] | null
          session_id: string | null
        }
        Insert: {
          admin_id?: string | null
          context_leads?: string[] | null
          conversation_id?: string | null
          created_at?: string | null
          embeddings?: string | null
          id?: string | null
          message_content?: string | null
          message_type?: Database["admin"]["Enums"]["message_type_enum"] | null
          session_id?: string | null
        }
        Update: {
          admin_id?: string | null
          context_leads?: string[] | null
          conversation_id?: string | null
          created_at?: string | null
          embeddings?: string | null
          id?: string | null
          message_content?: string | null
          message_type?: Database["admin"]["Enums"]["message_type_enum"] | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_sessions: {
        Row: {
          admin_id: string | null
          context_summary: string | null
          id: string | null
          is_active: boolean | null
          last_activity: string | null
          session_name: string | null
        }
        Insert: {
          admin_id?: string | null
          context_summary?: string | null
          id?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_name?: string | null
        }
        Update: {
          admin_id?: string | null
          context_summary?: string | null
          id?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_name?: string | null
        }
        Relationships: []
      }
      daily_token_usage: {
        Row: {
          model: string | null
          request_count: number | null
          total_cost: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          total_tokens: number | null
          usage_date: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      append_capability_if_missing: {
        Args:
          | {
              p_capability: Database["public"]["Enums"]["ai_capability"]
              p_session_id: string
            }
          | { p_capability: string; p_session_id: string }
          | { p_capability_name: string; p_context?: Json }
        Returns: undefined
      }
      database_health_check: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_slow_queries: {
        Args: Record<PropertyKey, never>
        Returns: {
          duration: unknown
          query: string
        }[]
      }
      has_capability_been_used: {
        Args: {
          p_capability: Database["public"]["Enums"]["ai_capability"]
          p_session_id: string
        }
        Returns: boolean
      }
      match_documents: {
        Args: { p_match_count: number; p_query: string; p_session_id: string }
        Returns: {
          distance: number
          id: string
          text: string
        }[]
      }
      search_transcripts: {
        Args: {
          max_results?: number
          result_offset?: number
          search_query: string
        }
        Returns: {
          content: string
          conversation_id: string
          message_type: string
          rank: number
          role: string
          session_id: string
        }[]
      }
      secure_function_template: {
        Args: { param1: string }
        Returns: string
      }
    }
    Enums: {
      ai_capability:
        | "text_generation"
        | "image_generation"
        | "code_completion"
        | "translation"
        | "summarization"
        | "sentiment_analysis"
        | "entity_extraction"
        | "voice_transcription"
        | "embeddings_generation"
        | "question_answering"
        | "intent_classification"
        | "language_detection"
        | "keyword_extraction"
        | "paraphrasing"
        | "content_moderation"
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
  admin: {
    Enums: {
      message_type_enum: ["user", "assistant", "system"],
    },
  },
  public: {
    Enums: {
      ai_capability: [
        "text_generation",
        "image_generation",
        "code_completion",
        "translation",
        "summarization",
        "sentiment_analysis",
        "entity_extraction",
        "voice_transcription",
        "embeddings_generation",
        "question_answering",
        "intent_classification",
        "language_detection",
        "keyword_extraction",
        "paraphrasing",
        "content_moderation",
      ],
    },
  },
} as const
