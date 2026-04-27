// Loose database typing for Supabase clients.
// Replace by `supabase gen types typescript` output when ready.

type Json = unknown;

type GenericTable<Row> = {
  Row: Row;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row> & Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      workspaces: GenericTable<{
        id: string;
        name: string;
        slug: string | null;
        logo_url: string | null;
        accent_color: string;
        font: string;
        address: string | null;
        phone: string | null;
        vat: string | null;
        default_template_id: string | null;
        stripe_customer_id: string | null;
        stripe_subscription_id: string | null;
        plan: "trial" | "solo" | "studio" | "pro";
        seats_paid: number;
        trial_ends_at: string | null;
        renders_used_this_month: number;
        projects_used_this_month: number;
        usage_period_start: string;
        created_at: string;
        updated_at: string;
      }>;
      profiles: GenericTable<{
        id: string;
        workspace_id: string | null;
        email: string;
        full_name: string | null;
        avatar_url: string | null;
        role: "owner" | "designer" | "viewer";
        invited_by: string | null;
        invited_at: string | null;
        joined_at: string | null;
        created_at: string;
      }>;
      clients: GenericTable<{
        id: string;
        workspace_id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        vat: string | null;
        notes: string | null;
        created_at: string;
        updated_at: string;
      }>;
      projects: GenericTable<{
        id: string;
        workspace_id: string;
        client_id: string | null;
        designer_id: string | null;
        name: string;
        type: "furniture" | "space";
        subtype: string | null;
        status: "draft" | "in_progress" | "pending_approval" | "approved" | "archived";
        location: string | null;
        briefing_text: string | null;
        briefing_json: Json;
        style_json: Json;
        plan_json: Json;
        measurements_json: Json;
        share_slug: string | null;
        share_password_hash: string | null;
        share_allow_comments: boolean;
        share_require_approval: boolean;
        share_opened_at: string | null;
        approved_at: string | null;
        approved_by_email: string | null;
        pdf_url: string | null;
        pdf_generated_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      project_versions: GenericTable<{
        id: string;
        project_id: string;
        snapshot_json: Json;
        created_by: string | null;
        created_at: string;
      }>;
      assets: GenericTable<{
        id: string;
        project_id: string;
        workspace_id: string;
        kind: "photo" | "reference" | "floorplan_input";
        storage_path: string;
        url: string | null;
        thumbnail_url: string | null;
        is_cover: boolean;
        tag: string | null;
        width: number | null;
        height: number | null;
        size_bytes: number | null;
        created_at: string;
      }>;
      renders: GenericTable<{
        id: string;
        project_id: string;
        workspace_id: string;
        prompt_pt: string | null;
        prompt_en: string | null;
        image_url: string | null;
        storage_path: string | null;
        status: "queued" | "generating" | "ready" | "failed";
        is_favorite: boolean;
        parent_render_id: string | null;
        generation_time_ms: number | null;
        cost_eur: number | null;
        error_message: string | null;
        created_at: string;
      }>;
      technical_views: GenericTable<{
        id: string;
        project_id: string;
        workspace_id: string;
        view_type: string;
        svg: string;
        dimensions_json: Json;
        annotations_json: Json;
        created_at: string;
      }>;
      slides: GenericTable<{
        id: string;
        project_id: string;
        workspace_id: string;
        position: number;
        type: string;
        content_json: Json;
        created_at: string;
        updated_at: string;
      }>;
      comments: GenericTable<{
        id: string;
        project_id: string;
        slide_id: string | null;
        author_name: string;
        author_email: string | null;
        text: string;
        created_at: string;
      }>;
      notifications: GenericTable<{
        id: string;
        user_id: string;
        workspace_id: string;
        type: string;
        payload_json: Json;
        read_at: string | null;
        created_at: string;
      }>;
      templates: GenericTable<{
        id: string;
        workspace_id: string;
        name: string;
        is_default: boolean;
        structure_json: Json;
        created_at: string;
      }>;
      events: GenericTable<{
        id: string;
        workspace_id: string | null;
        user_id: string | null;
        event_name: string;
        payload_json: Json;
        created_at: string;
      }>;
      invites: GenericTable<{
        id: string;
        workspace_id: string;
        email: string;
        role: "owner" | "designer" | "viewer";
        token: string;
        invited_by: string | null;
        expires_at: string;
        accepted_at: string | null;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
