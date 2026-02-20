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
      admin_users: {
        Row: {
          assigned_district: string | null
          created_at: string
          demo_tag: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_district?: string | null
          created_at?: string
          demo_tag?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_district?: string | null
          created_at?: string
          demo_tag?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_activity_logs: {
        Row: {
          action_type: string
          actor_id: string
          actor_role: string
          created_at: string
          details: Json | null
          farmer_id: string | null
          id: string
        }
        Insert: {
          action_type: string
          actor_id: string
          actor_role: string
          created_at?: string
          details?: Json | null
          farmer_id?: string | null
          id?: string
        }
        Update: {
          action_type?: string
          actor_id?: string
          actor_role?: string
          created_at?: string
          details?: Json | null
          farmer_id?: string | null
          id?: string
        }
        Relationships: []
      }
      agent_data: {
        Row: {
          agent_id: string
          created_at: string
          crop_health: string | null
          crop_type: string | null
          demo_tag: string | null
          farm_location: string | null
          farmer_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          soil_moisture: string | null
          soil_ph: number | null
          soil_type: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          crop_health?: string | null
          crop_type?: string | null
          demo_tag?: string | null
          farm_location?: string | null
          farmer_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          soil_moisture?: string | null
          soil_ph?: number | null
          soil_type?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          crop_health?: string | null
          crop_type?: string | null
          demo_tag?: string | null
          farm_location?: string | null
          farmer_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          soil_moisture?: string | null
          soil_ph?: number | null
          soil_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_farmer_assignments: {
        Row: {
          active: boolean | null
          agent_id: string
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          demo_tag: string | null
          farmer_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          agent_id: string
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          demo_tag?: string | null
          farmer_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          agent_id?: string
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          demo_tag?: string | null
          farmer_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_tasks: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          created_by_role: string | null
          crop_id: string | null
          demo_tag: string | null
          due_date: string
          farmer_id: string
          id: string
          notes: string | null
          payload: Json | null
          priority: number | null
          task_status: Database["public"]["Enums"]["agent_task_status"]
          task_type: Database["public"]["Enums"]["agent_task_type"]
          updated_at: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          created_by_role?: string | null
          crop_id?: string | null
          demo_tag?: string | null
          due_date?: string
          farmer_id: string
          id?: string
          notes?: string | null
          payload?: Json | null
          priority?: number | null
          task_status?: Database["public"]["Enums"]["agent_task_status"]
          task_type: Database["public"]["Enums"]["agent_task_type"]
          updated_at?: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          created_by_role?: string | null
          crop_id?: string | null
          demo_tag?: string | null
          due_date?: string
          farmer_id?: string
          id?: string
          notes?: string | null
          payload?: Json | null
          priority?: number | null
          task_status?: Database["public"]["Enums"]["agent_task_status"]
          task_type?: Database["public"]["Enums"]["agent_task_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_visits: {
        Row: {
          agent_id: string
          check_in_at: string
          check_out_at: string | null
          created_at: string | null
          demo_tag: string | null
          farmer_id: string
          id: string
          notes: string | null
          task_id: string | null
        }
        Insert: {
          agent_id: string
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string | null
          demo_tag?: string | null
          farmer_id: string
          id?: string
          notes?: string | null
          task_id?: string | null
        }
        Update: {
          agent_id?: string
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string | null
          demo_tag?: string | null
          farmer_id?: string
          id?: string
          notes?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_visits_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_voice_notes: {
        Row: {
          agent_id: string
          audio_path: string | null
          created_at: string
          crop_id: string | null
          farmer_id: string | null
          id: string
          language_code: string | null
          note_text: string | null
          task_id: string | null
        }
        Insert: {
          agent_id: string
          audio_path?: string | null
          created_at?: string
          crop_id?: string | null
          farmer_id?: string | null
          id?: string
          language_code?: string | null
          note_text?: string | null
          task_id?: string | null
        }
        Update: {
          agent_id?: string
          audio_path?: string | null
          created_at?: string
          crop_id?: string | null
          farmer_id?: string | null
          id?: string
          language_code?: string | null
          note_text?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_voice_notes_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_voice_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          buyer_type: string | null
          company_name: string | null
          created_at: string
          demo_tag: string | null
          district: string | null
          id: string
          name: string
          phone: string | null
          preferred_crops: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          buyer_type?: string | null
          company_name?: string | null
          created_at?: string
          demo_tag?: string | null
          district?: string | null
          id?: string
          name: string
          phone?: string | null
          preferred_crops?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          buyer_type?: string | null
          company_name?: string | null
          created_at?: string
          demo_tag?: string | null
          district?: string | null
          id?: string
          name?: string
          phone?: string | null
          preferred_crops?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crop_activity_logs: {
        Row: {
          activity_type: string
          actor_id: string | null
          created_at: string
          crop_id: string
          id: string
          media_ids: string[] | null
          notes: string | null
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          created_at?: string
          crop_id: string
          id?: string
          media_ids?: string[] | null
          notes?: string | null
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          created_at?: string
          crop_id?: string
          id?: string
          media_ids?: string[] | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_activity_logs_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_media: {
        Row: {
          captured_at: string | null
          created_at: string | null
          crop_id: string
          file_path: string
          file_type: string | null
          id: string
        }
        Insert: {
          captured_at?: string | null
          created_at?: string | null
          crop_id: string
          file_path: string
          file_type?: string | null
          id?: string
        }
        Update: {
          captured_at?: string | null
          created_at?: string | null
          crop_id?: string
          file_path?: string
          file_type?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_media_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
        ]
      }
      crops: {
        Row: {
          created_at: string
          crop_name: string
          demo_tag: string | null
          estimated_quantity: number | null
          farmer_id: string
          growth_stage: string | null
          harvest_estimate: string | null
          health_status: string | null
          id: string
          land_id: string | null
          last_observed_issue_at: string | null
          last_photo_at: string | null
          quantity_unit: string | null
          sowing_date: string | null
          status: Database["public"]["Enums"]["crop_status"]
          updated_at: string
          variety: string | null
        }
        Insert: {
          created_at?: string
          crop_name: string
          demo_tag?: string | null
          estimated_quantity?: number | null
          farmer_id: string
          growth_stage?: string | null
          harvest_estimate?: string | null
          health_status?: string | null
          id?: string
          land_id?: string | null
          last_observed_issue_at?: string | null
          last_photo_at?: string | null
          quantity_unit?: string | null
          sowing_date?: string | null
          status?: Database["public"]["Enums"]["crop_status"]
          updated_at?: string
          variety?: string | null
        }
        Update: {
          created_at?: string
          crop_name?: string
          demo_tag?: string | null
          estimated_quantity?: number | null
          farmer_id?: string
          growth_stage?: string | null
          harvest_estimate?: string | null
          health_status?: string | null
          id?: string
          land_id?: string | null
          last_observed_issue_at?: string | null
          last_photo_at?: string | null
          quantity_unit?: string | null
          sowing_date?: string | null
          status?: Database["public"]["Enums"]["crop_status"]
          updated_at?: string
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crops_land_id_fkey"
            columns: ["land_id"]
            isOneToOne: false
            referencedRelation: "farmlands"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_segments: {
        Row: {
          created_at: string | null
          crop_canonical: string | null
          district: string | null
          id: string
          segment_key: string | null
        }
        Insert: {
          created_at?: string | null
          crop_canonical?: string | null
          district?: string | null
          id?: string
          segment_key?: string | null
        }
        Update: {
          created_at?: string | null
          crop_canonical?: string | null
          district?: string | null
          id?: string
          segment_key?: string | null
        }
        Relationships: []
      }
      farmlands: {
        Row: {
          area: number
          area_unit: string
          created_at: string
          demo_tag: string | null
          district: string | null
          farmer_id: string
          geo_verified: boolean
          id: string
          location_lat: number | null
          location_long: number | null
          name: string
          soil_type: string | null
          updated_at: string
          village: string | null
        }
        Insert: {
          area?: number
          area_unit?: string
          created_at?: string
          demo_tag?: string | null
          district?: string | null
          farmer_id: string
          geo_verified?: boolean
          id?: string
          location_lat?: number | null
          location_long?: number | null
          name: string
          soil_type?: string | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          area?: number
          area_unit?: string
          created_at?: string
          demo_tag?: string | null
          district?: string | null
          farmer_id?: string
          geo_verified?: boolean
          id?: string
          location_lat?: number | null
          location_long?: number | null
          name?: string
          soil_type?: string | null
          updated_at?: string
          village?: string | null
        }
        Relationships: []
      }
      karnataka_districts: {
        Row: {
          created_at: string | null
          district: string
          id: string
        }
        Insert: {
          created_at?: string | null
          district: string
          id?: string
        }
        Update: {
          created_at?: string | null
          district?: string
          id?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          category: string
          created_at: string
          crop_id: string | null
          demo_tag: string | null
          description: string | null
          id: string
          image_url: string | null
          inputs_summary: string | null
          is_active: boolean
          location: string | null
          price: number
          quantity: number
          seller_id: string
          test_report_urls: Json
          title: string
          trace_code: string | null
          trace_settings: Json | null
          trace_status: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          crop_id?: string | null
          demo_tag?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          inputs_summary?: string | null
          is_active?: boolean
          location?: string | null
          price: number
          quantity: number
          seller_id: string
          test_report_urls?: Json
          title: string
          trace_code?: string | null
          trace_settings?: Json | null
          trace_status?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          crop_id?: string | null
          demo_tag?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          inputs_summary?: string | null
          is_active?: boolean
          location?: string | null
          price?: number
          quantity?: number
          seller_id?: string
          test_report_urls?: Json
          title?: string
          trace_code?: string | null
          trace_settings?: Json | null
          trace_status?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
        ]
      }
      market_orders: {
        Row: {
          buyer_id: string
          created_at: string
          crop_id: string | null
          demo_tag: string | null
          farmer_id: string
          id: string
          listing_id: string | null
          price_agreed: number | null
          quantity: number
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          crop_id?: string | null
          demo_tag?: string | null
          farmer_id: string
          id?: string
          listing_id?: string | null
          price_agreed?: number | null
          quantity: number
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          crop_id?: string | null
          demo_tag?: string | null
          farmer_id?: string
          id?: string
          listing_id?: string | null
          price_agreed?: number | null
          quantity?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_orders_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      market_prices: {
        Row: {
          created_at: string | null
          crop_name: string
          date: string
          district: string | null
          id: string
          mandi_name: string | null
          max_price: number | null
          min_price: number | null
          modal_price: number | null
        }
        Insert: {
          created_at?: string | null
          crop_name: string
          date: string
          district?: string | null
          id?: string
          mandi_name?: string | null
          max_price?: number | null
          min_price?: number | null
          modal_price?: number | null
        }
        Update: {
          created_at?: string | null
          crop_name?: string
          date?: string
          district?: string | null
          id?: string
          mandi_name?: string | null
          max_price?: number | null
          min_price?: number | null
          modal_price?: number | null
        }
        Relationships: []
      }
      market_prices_agg: {
        Row: {
          avg_price: number | null
          created_at: string | null
          crop_name: string
          date: string | null
          district: string | null
          id: string
          trend_direction: string | null
        }
        Insert: {
          avg_price?: number | null
          created_at?: string | null
          crop_name: string
          date?: string | null
          district?: string | null
          id?: string
          trend_direction?: string | null
        }
        Update: {
          avg_price?: number | null
          created_at?: string | null
          crop_name?: string
          date?: string | null
          district?: string | null
          id?: string
          trend_direction?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_email: string | null
          avatar_url: string | null
          created_at: string
          demo_tag: string | null
          district: string | null
          district_confidence: string | null
          district_source: string | null
          full_name: string | null
          id: string
          location: string | null
          phone: string | null
          pincode: string | null
          preferred_language: string | null
          taluk: string | null
          total_land_area: number | null
          updated_at: string
          village: string | null
        }
        Insert: {
          auth_email?: string | null
          avatar_url?: string | null
          created_at?: string
          demo_tag?: string | null
          district?: string | null
          district_confidence?: string | null
          district_source?: string | null
          full_name?: string | null
          id: string
          location?: string | null
          phone?: string | null
          pincode?: string | null
          preferred_language?: string | null
          taluk?: string | null
          total_land_area?: number | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          auth_email?: string | null
          avatar_url?: string | null
          created_at?: string
          demo_tag?: string | null
          district?: string | null
          district_confidence?: string | null
          district_source?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          pincode?: string | null
          preferred_language?: string | null
          taluk?: string | null
          total_land_area?: number | null
          updated_at?: string
          village?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      soil_test_reports: {
        Row: {
          consent_at: string | null
          consent_captured: boolean | null
          consent_note: string | null
          created_at: string
          ec: number | null
          extracted_data: Json | null
          farmer_id: string
          farmland_id: string
          id: string
          lab_name: string | null
          nitrogen: number | null
          notes: string | null
          organic_carbon: number | null
          ph: number | null
          phosphorus: number | null
          potassium: number | null
          report_date: string
          report_file_path: string
          report_file_type: string
          report_mime_type: string | null
          source_role: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          consent_at?: string | null
          consent_captured?: boolean | null
          consent_note?: string | null
          created_at?: string
          ec?: number | null
          extracted_data?: Json | null
          farmer_id: string
          farmland_id: string
          id?: string
          lab_name?: string | null
          nitrogen?: number | null
          notes?: string | null
          organic_carbon?: number | null
          ph?: number | null
          phosphorus?: number | null
          potassium?: number | null
          report_date: string
          report_file_path: string
          report_file_type: string
          report_mime_type?: string | null
          source_role?: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          consent_at?: string | null
          consent_captured?: boolean | null
          consent_note?: string | null
          created_at?: string
          ec?: number | null
          extracted_data?: Json | null
          farmer_id?: string
          farmland_id?: string
          id?: string
          lab_name?: string | null
          nitrogen?: number | null
          notes?: string | null
          organic_carbon?: number | null
          ph?: number | null
          phosphorus?: number | null
          potassium?: number | null
          report_date?: string
          report_file_path?: string
          report_file_type?: string
          report_mime_type?: string | null
          source_role?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "soil_test_reports_farmland_id_fkey"
            columns: ["farmland_id"]
            isOneToOne: false
            referencedRelation: "farmlands"
            referencedColumns: ["id"]
          },
        ]
      }
      trace_attachments: {
        Row: {
          captured_at: string | null
          created_at: string | null
          file_type: string
          file_url: string
          id: string
          notes: string | null
          owner_id: string | null
          owner_type: string | null
          tag: string | null
          uploaded_by: string | null
          uploader_id: string | null
          visibility: string | null
        }
        Insert: {
          captured_at?: string | null
          created_at?: string | null
          file_type: string
          file_url: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          owner_type?: string | null
          tag?: string | null
          uploaded_by?: string | null
          uploader_id?: string | null
          visibility?: string | null
        }
        Update: {
          captured_at?: string | null
          created_at?: string | null
          file_type?: string
          file_url?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          owner_type?: string | null
          tag?: string | null
          uploaded_by?: string | null
          uploader_id?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      transport_requests: {
        Row: {
          assigned_at: string | null
          assigned_trip_id: string | null
          cancellation_reason: string | null
          completed_at: string | null
          created_at: string
          crop_id: string | null
          delivery_photo_url: string | null
          demo_tag: string | null
          distance_km: number | null
          drop_location: string | null
          fare_estimate: number | null
          farmer_id: string
          id: string
          notes: string | null
          pickup_location: string
          pickup_photo_url: string | null
          pickup_village: string | null
          pickup_window_end: string | null
          pickup_window_start: string | null
          preferred_date: string | null
          preferred_time: string | null
          quantity: number
          quantity_unit: string | null
          status: Database["public"]["Enums"]["transport_status"]
          status_updated_at: string | null
          transporter_id: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_trip_id?: string | null
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string
          crop_id?: string | null
          delivery_photo_url?: string | null
          demo_tag?: string | null
          distance_km?: number | null
          drop_location?: string | null
          fare_estimate?: number | null
          farmer_id: string
          id?: string
          notes?: string | null
          pickup_location: string
          pickup_photo_url?: string | null
          pickup_village?: string | null
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          quantity: number
          quantity_unit?: string | null
          status?: Database["public"]["Enums"]["transport_status"]
          status_updated_at?: string | null
          transporter_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_trip_id?: string | null
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string
          crop_id?: string | null
          delivery_photo_url?: string | null
          demo_tag?: string | null
          distance_km?: number | null
          drop_location?: string | null
          fare_estimate?: number | null
          farmer_id?: string
          id?: string
          notes?: string | null
          pickup_location?: string
          pickup_photo_url?: string | null
          pickup_village?: string | null
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          quantity?: number
          quantity_unit?: string | null
          status?: Database["public"]["Enums"]["transport_status"]
          status_updated_at?: string | null
          transporter_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_requests_assigned_trip_id_fkey"
            columns: ["assigned_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_status_events: {
        Row: {
          actor_id: string
          actor_role: string
          created_at: string | null
          demo_tag: string | null
          id: string
          new_status: string
          note: string | null
          old_status: string | null
          transport_request_id: string
          trip_id: string | null
        }
        Insert: {
          actor_id: string
          actor_role: string
          created_at?: string | null
          demo_tag?: string | null
          id?: string
          new_status: string
          note?: string | null
          old_status?: string | null
          transport_request_id: string
          trip_id?: string | null
        }
        Update: {
          actor_id?: string
          actor_role?: string
          created_at?: string | null
          demo_tag?: string | null
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
          transport_request_id?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_status_events_transport_request_id_fkey"
            columns: ["transport_request_id"]
            isOneToOne: false
            referencedRelation: "transport_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_status_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      transporters: {
        Row: {
          created_at: string
          demo_tag: string | null
          id: string
          name: string
          operating_district: string | null
          operating_village: string | null
          phone: string | null
          registration_number: string | null
          updated_at: string
          user_id: string
          vehicle_capacity: number | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          demo_tag?: string | null
          id?: string
          name: string
          operating_district?: string | null
          operating_village?: string | null
          phone?: string | null
          registration_number?: string | null
          updated_at?: string
          user_id: string
          vehicle_capacity?: number | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          demo_tag?: string | null
          id?: string
          name?: string
          operating_district?: string | null
          operating_village?: string | null
          phone?: string | null
          registration_number?: string | null
          updated_at?: string
          user_id?: string
          vehicle_capacity?: number | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      trips: {
        Row: {
          actual_weight_kg: number | null
          arrived_at: string | null
          assigned_at: string | null
          cancelled_at: string | null
          created_at: string | null
          delivered_at: string | null
          delivery_otp_required: boolean | null
          delivery_otp_verified: boolean | null
          delivery_proofs: Json | null
          demo_tag: string | null
          en_route_at: string | null
          id: string
          issue_code: string | null
          issue_notes: string | null
          picked_up_at: string | null
          pickup_otp_required: boolean | null
          pickup_otp_verified: boolean | null
          pickup_proofs: Json | null
          status: string
          transport_request_id: string
          transporter_id: string
          updated_at: string | null
        }
        Insert: {
          actual_weight_kg?: number | null
          arrived_at?: string | null
          assigned_at?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_otp_required?: boolean | null
          delivery_otp_verified?: boolean | null
          delivery_proofs?: Json | null
          demo_tag?: string | null
          en_route_at?: string | null
          id?: string
          issue_code?: string | null
          issue_notes?: string | null
          picked_up_at?: string | null
          pickup_otp_required?: boolean | null
          pickup_otp_verified?: boolean | null
          pickup_proofs?: Json | null
          status?: string
          transport_request_id: string
          transporter_id: string
          updated_at?: string | null
        }
        Update: {
          actual_weight_kg?: number | null
          arrived_at?: string | null
          assigned_at?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_otp_required?: boolean | null
          delivery_otp_verified?: boolean | null
          delivery_proofs?: Json | null
          demo_tag?: string | null
          en_route_at?: string | null
          id?: string
          issue_code?: string | null
          issue_notes?: string | null
          picked_up_at?: string | null
          pickup_otp_required?: boolean | null
          pickup_otp_verified?: boolean | null
          pickup_proofs?: Json | null
          status?: string
          transport_request_id?: string
          transporter_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_transport_request_id_fkey"
            columns: ["transport_request_id"]
            isOneToOne: false
            referencedRelation: "transport_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_sources: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          url_pattern: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          url_pattern?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          url_pattern?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          capacity_kg: number | null
          created_at: string
          id: string
          refrigerated: boolean | null
          registration_number: string | null
          transporter_id: string
          vehicle_type: string | null
        }
        Insert: {
          capacity_kg?: number | null
          created_at?: string
          id?: string
          refrigerated?: boolean | null
          registration_number?: string | null
          transporter_id: string
          vehicle_type?: string | null
        }
        Update: {
          capacity_kg?: number | null
          created_at?: string
          id?: string
          refrigerated?: boolean | null
          registration_number?: string | null
          transporter_id?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "transporters"
            referencedColumns: ["id"]
          },
        ]
      }
      web_fetch_logs: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_transport_load: {
        Args: {
          p_caller_id?: string
          p_transport_request_id: string
          p_vehicle_id?: string
        }
        Returns: Json
      }
      create_kyc_record: {
        Args: {
          p_payload: string
          p_provider_reference: string
          p_user_id: string
        }
        Returns: string
      }
      current_role: { Args: never; Returns: string }
      get_farmer_orders_with_context: {
        Args: { p_farmer_id: string }
        Returns: Json
      }
      get_trip_detail_with_context: {
        Args: { p_trip_id: string }
        Returns: Json
      }
      get_trips_with_context: {
        Args: { p_status_filter?: string[]; p_transporter_id: string }
        Returns: Json
      }
      insert_audit_log: {
        Args: {
          p_action_type: string
          p_entity_id?: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      insert_security_event: {
        Args: { p_details?: Json; p_event_type: string; p_severity: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_agent_assigned: {
        Args: { target_farmer_id: string }
        Returns: boolean
      }
      update_order_status_v1: {
        Args: { p_metadata?: Json; p_new_status: string; p_order_id: string }
        Returns: Json
      }
      update_trip_status_v1: {
        Args: { p_metadata?: Json; p_new_status: string; p_trip_id: string }
        Returns: Json
      }
    }
    Enums: {
      agent_task_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "approved"
        | "rejected"
      agent_task_type:
        | "visit"
        | "verify_crop"
        | "harvest_check"
        | "transport_assist"
        | "onboard_farmer"
        | "update_profile"
        | "soil_report_upload"
        | "field_visit"
        | "farmer_request"
      app_role: "farmer" | "buyer" | "agent" | "logistics" | "admin"
      crop_status: "growing" | "one_week" | "ready" | "harvested"
      transport_status:
        | "requested"
        | "assigned"
        | "en_route"
        | "picked_up"
        | "delivered"
        | "cancelled"
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
      agent_task_status: [
        "pending",
        "in_progress",
        "completed",
        "approved",
        "rejected",
      ],
      agent_task_type: [
        "visit",
        "verify_crop",
        "harvest_check",
        "transport_assist",
        "onboard_farmer",
        "update_profile",
        "soil_report_upload",
        "field_visit",
        "farmer_request",
      ],
      app_role: ["farmer", "buyer", "agent", "logistics", "admin"],
      crop_status: ["growing", "one_week", "ready", "harvested"],
      transport_status: [
        "requested",
        "assigned",
        "en_route",
        "picked_up",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
