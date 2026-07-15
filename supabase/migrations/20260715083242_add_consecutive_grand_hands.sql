/*
# Add consecutive_grand_hands counter to sessions

1. Modified Tables
- `sessions`: add `consecutive_grand_hands` integer column (default 0)
  - Tracks how many Grand Hands have been played in a row during a Ramsch round.
  - When it reaches 3, the next game must be a Ramsch (not a Grand Hand).
  - After the forced Ramsch, the counter resets to 0.
2. Security
- No RLS changes — existing policies still apply.
*/

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS consecutive_grand_hands integer NOT NULL DEFAULT 0;
