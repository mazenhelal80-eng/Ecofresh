-- AlterTable
ALTER TABLE "client_orders" DROP COLUMN "delivery_terms",
DROP COLUMN "destination_port";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "destination_port";

-- AlterTable
ALTER TABLE "shipments" DROP COLUMN "destination_port";
