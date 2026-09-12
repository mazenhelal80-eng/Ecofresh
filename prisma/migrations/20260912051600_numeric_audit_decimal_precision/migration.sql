-- AlterTable
ALTER TABLE "packaging_purchases" ALTER COLUMN "qty" TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "stations" ALTER COLUMN "cold_storage_capacity_kg" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "cold_storage_capacity_kg" SET DEFAULT 100000.00;
