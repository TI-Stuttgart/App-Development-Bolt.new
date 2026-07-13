/*
# Add ramsch_augen and is_spaltarsch columns to games

1. Modified Tables
- `games`:
  - `ramsch_augen` (integer, nullable, default null): The eye points (Augen) of the loser in a Ramsch or Tischramsch game. These points are added to the multiplier to form the final game value. Null for non-Ramsch games.
  - `is_spaltarsch` (boolean, default false): Marks a Ramsch game where two players tied at 60:60 (Spaltarsch). Adds +1 to the multiplier.

2. Notes
- These columns support the updated Ramsch scoring: the loser's Augen (including the Skat) are added to the calculated value, and Spaltarsch gives +1 multiplier.
- Lost doubling has been removed from the scoring logic entirely; lost_doubling_count remains in the table for historical data but is always 0 for new games.
- No RLS changes needed — existing policies cover the new columns automatically.
*/

ALTER TABLE games ADD COLUMN IF NOT EXISTS ramsch_augen integer DEFAULT null;
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_spaltarsch boolean NOT NULL DEFAULT false;
