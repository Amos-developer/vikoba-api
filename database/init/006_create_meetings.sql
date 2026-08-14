CREATE TABLE IF NOT EXISTS meetings (
    id BIGSERIAL PRIMARY KEY,
    meeting_date TIMESTAMPTZ NOT NULL,
    agenda TEXT NOT NULL,
    decisions TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
      CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_attendance (
    id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'present'
      CHECK (attendance_status IN ('present', 'late', 'absent', 'excused')),
    contribution_amount NUMERIC(15, 2) NOT NULL DEFAULT 0
      CHECK (contribution_amount >= 0),
    notes VARCHAR(255),
    UNIQUE (meeting_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_meeting
  ON meeting_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_member
  ON meeting_attendance(member_id);


