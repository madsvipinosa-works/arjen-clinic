-- Adds PhilHealth MCP Compliance Override to maternal episodes

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='maternal_episodes' AND column_name='philhealth_mcp_override'
  ) THEN
    ALTER TABLE public.maternal_episodes
      ADD COLUMN philhealth_mcp_override BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
