-- Extensions and helper functions the rest of the schema depends on.
-- This migration runs first because `uuid_generate_v7()` is a column default
-- on every table, and PostGIS types are used in the geography domain.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Trigram search for vendor and service name lookup.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Exclusion constraints over ranges, used by availability work later.
CREATE EXTENSION IF NOT EXISTS btree_gist;

--> statement-breakpoint

-- UUID v7: time-ordered, so ids cluster by creation time and index like a
-- serial without leaking row counts. Postgres 18 ships uuidv7() natively;
-- this keeps the schema identical on 16, which is what we deploy on.
--
-- Layout (RFC 9562): 48 bits of Unix milliseconds, 4 bits version (7),
-- 12 bits of sub-millisecond randomness, 2 bits variant, 62 bits random.
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms := substring(int8send((extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3);

  -- 10 random bytes fill everything after the timestamp.
  uuid_bytes := unix_ts_ms || gen_random_bytes(10);

  -- Version 7: high nibble of byte 7.
  uuid_bytes := set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(8) << 4 >> 4)::bit(8)::int);
  -- Variant 10xx: top two bits of byte 9.
  uuid_bytes := set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(8) << 2 >> 2)::bit(8)::int);

  RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;

--> statement-breakpoint

COMMENT ON FUNCTION uuid_generate_v7() IS
  'RFC 9562 UUID v7. Replace with the native uuidv7() when the cluster reaches Postgres 18.';
