-- AlterTable
ALTER TABLE "contractors" DROP CONSTRAINT IF EXISTS "contractors_station_id_fkey";
ALTER TABLE "contractors" DROP COLUMN IF EXISTS "station_id";
