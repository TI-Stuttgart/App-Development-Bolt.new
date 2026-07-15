/*
# Add regular Bock/Ramsch round counters to sessions

1. Modified Tables
- `sessions`: add `total_regular_bock_rounds` (int, default 0) — counts completed regular Bock rounds (excludes Spaltarsch Bock)
- `sessions`: add `total_regular_ramsch_rounds` (int, default 0) — counts completed regular Ramsch rounds (excludes Spaltarsch Ramsch)

These counters are needed to correctly interleave Ramsch rounds after every 2 regular Bock rounds,
even when earlier Bock/Ramsch rounds have already been consumed and removed from the queue.
*/

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS total_regular_bock_rounds integer NOT NULL DEFAULT 0;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS total_regular_ramsch_rounds integer NOT NULL DEFAULT 0;
