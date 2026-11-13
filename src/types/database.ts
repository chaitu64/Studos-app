// Public relation names after migration 016. The client schema remains open so
// existing app services that use unrelated public tables retain their current
// inferred behavior until a complete schema export is checked in.
type RelationShape = {
  Row: any;
  Insert: any;
  Update: any;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: Record<string, RelationShape> & {
      profiles: RelationShape;
      content: RelationShape;
      ideas: RelationShape;
      services: RelationShape;
      help_requests: RelationShape;
      team_openings: RelationShape;
      private_details: RelationShape;
      problems: RelationShape;
      portfolio: RelationShape;
      idea_actors: RelationShape;
      idea_comments: RelationShape;
      idea_requests: RelationShape;
      idea_sparks: RelationShape;
      idea_live_collaborators: RelationShape;
      idea_live_comments: RelationShape;
      idea_live_requests: RelationShape;
      idea_live_sparks: RelationShape;
      idea_live_saves: RelationShape;
      contact_requests: RelationShape;
      polls: RelationShape;
      poll_options: RelationShape;
      poll_votes: RelationShape;
    };
    Views: Record<string, RelationShape> & { ideas_feed: RelationShape };
    Functions: Record<string, { Args: Record<string, any>; Returns: any }> & {
      create_community_poll: { Args: { poll_title: string; poll_description: string; option_values: string[]; poll_external_url?: string | null; poll_closes_at?: string | null }; Returns: string };
      get_community_poll: { Args: { target_poll_id: string }; Returns: Record<string, any> };
    };
    Enums: Record<string, string>;
    CompositeTypes: Record<string, Record<string, any>>;
  };
};
