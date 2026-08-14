ALTER TABLE penalties
  ADD COLUMN IF NOT EXISTS meeting_id BIGINT REFERENCES meetings(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_penalties_meeting_member
  ON penalties(meeting_id, member_id) WHERE meeting_id IS NOT NULL;


