import { prisma } from "@/lib/prisma";
import { getProcessingOperationsPaginated, cancelProcessingOperation } from "@/actions/processing";
import { cancelStockTransfer } from "@/actions/transfers";
import { cancelShipment } from "@/actions/shipments";
import { WarehouseType } from "@prisma/client";

async function runGapClosureTests() {
  console.log("=================================================");
  console.log("🚀 STARTING GAP CLOSURE VERIFICATION TESTS");
  console.log("=================================================");

  const adminUser = await prisma.userProfile.findFirst();
  const userId = adminUser ? adminUser.id : "00000000-0000-0000-0000-000000000001";
  const station1 = await prisma.station.findFirst();
  const station2 = await prisma.station.findMany().then((s) => s[1] || s[0]);
  const contractor = await prisma.contractor.findFirst();

  // -------------------------------------------------------------
  // GAP 1: Seed 35 operations & verify Page 1 vs Page 2 Pagination
  // -------------------------------------------------------------
  console.log("\n--- GAP 1: Real Pagination Test with 35+ Operations ---");
  const existingOpsCount = await prisma.processingOperation.count();
  if (existingOpsCount < 30 && station1 && contractor) {
    console.log(`Seeding additional records to reach > 30 operations (current: ${existingOpsCount})...`);
    for (let i = existingOpsCount + 1; i <= 35; i++) {
      const opId = `PR-SEED-PAG-${String(i).padStart(3, "0")}`;
      await prisma.processingOperation.create({
        data: {
          id: opId,
          date: new Date(),
          stationId: station1.id,
          rawProduct: "فراولة خام تجميعية",
          finishedProduct: "فراولة مجمدة IQF",
          contractorId: contractor.id,
          rawInputKg: 1000,
          finishedOutputKg: 800,
          rawWasteKg: 200,
          yieldPercent: 80,
          rawCost: 10000,
          suppliesConsumedCost: 500,
          suppliesWasteCost: 100,
          contractorCost: 1600,
          stationCost: 2000,
          otherCost: 0,
          grandTotalCost: 14200,
          costPerKg: 17.75,
          createdById: userId,
        },
      });
    }
  }

  const pag1 = await getProcessingOperationsPaginated(1, 25);
  const pag2 = await getProcessingOperationsPaginated(2, 25);

  console.log(`Total Operations Count in Database: ${pag1.totalCount}`);
  console.log(`Total Pages: ${pag1.totalPages}`);
  console.log(`Page 1 Operations Count: ${pag1.operations.length}`);
  console.log(`Page 1 First Item ID: ${pag1.operations[0].id}`);
  console.log(`Page 1 Last Item ID: ${pag1.operations[pag1.operations.length - 1].id}`);

  console.log(`\nPage 2 Operations Count: ${pag2.operations.length}`);
  if (pag2.operations.length > 0) {
    console.log(`Page 2 First Item ID: ${pag2.operations[0].id}`);
    console.log(`Page 2 Last Item ID: ${pag2.operations[pag2.operations.length - 1].id}`);

    // Verify non-overlapping set
    const p1Ids = new Set(pag1.operations.map((o: any) => o.id));
    const p2Ids = new Set(pag2.operations.map((o: any) => o.id));
    const intersection = Array.from(p1Ids).filter((id) => p2Ids.has(id));

    console.log(`\n[Pagination Overlap Verification]`);
    console.log(`- Duplicated/Overlapping Items Count between Page 1 & Page 2: ${intersection.length}`);
    console.log(`- Pagination Integrity Check: ${intersection.length === 0 ? "✅ PASSED (NO OVERLAP)" : "❌ FAILED"}`);
    console.log(`- Sum of Page 1 + Page 2 Items: ${pag1.operations.length + pag2.operations.length} of ${pag1.totalCount} total`);
  }

  // -------------------------------------------------------------
  // GAP 2A: Cancel Inter-Station Stock Transfer Test
  // -------------------------------------------------------------
  console.log("\n--- GAP 2A: Inter-Station Stock Transfer Cancellation Test ---");
  if (station1 && station2) {
    const trfId = `TRF-TEST-${Date.now().toString().slice(-4)}`;
    const fgBatchId = `FG-TRF-TEST-${Date.now().toString().slice(-4)}`;
    const targetBatchId = `${fgBatchId}-T-${station2.id}`;

    // Create source batch in Station 1 with 500 Kg
    await prisma.finishedGoodsBatch.create({
      data: {
        fgBatchId,
        sourceType: "MANUFACTURED",
        stationId: station1.id,
        productName: "فراولة مجمدة IQF تحويل",
        productionDate: new Date(),
        initialQty: 500,
        availableQty: 300, // 200 withdrawn in transfer
        costPerKg: 20,
        totalValue: 10000,
        createdById: userId,
      },
    });

    // Create target batch in Station 2 with 200 Kg
    await prisma.finishedGoodsBatch.create({
      data: {
        fgBatchId: targetBatchId,
        sourceType: "MANUFACTURED",
        stationId: station2.id,
        productName: "فراولة مجمدة IQF تحويل",
        productionDate: new Date(),
        initialQty: 200,
        availableQty: 200, // Still fully available at destination
        costPerKg: 20,
        totalValue: 4000,
        createdById: userId,
      },
    });

    // Create StockTransfer Record (200 Kg)
    await prisma.stockTransfer.create({
      data: {
        transferId: trfId,
        date: new Date(),
        fromStationId: station1.id,
        toStationId: station2.id,
        itemType: WarehouseType.FINISHED,
        fgBatchId: fgBatchId,
        batchId: fgBatchId,
        productName: "فراولة مجمدة IQF تحويل",
        qtyKg: 200,
        status: "تم الاستلام بنجاح",
        createdById: userId,
      },
    });

    console.log(`Created Stock Transfer ${trfId}: 200 KG from ${station1.name} -> ${station2.name}`);

    // Execute Cancel Transfer Server Action
    const trfCancelRes = await cancelStockTransfer(trfId, "إلغاء تحويل تجريبي لإثبات استعادة الأرصدة بالمحطتين عبر Modal");
    console.log(`Cancel Transfer Server Action Output:`, trfCancelRes);

    // Verify DB balances
    const sourceBatchRefreshed = await prisma.finishedGoodsBatch.findUnique({ where: { fgBatchId } });
    const targetBatchRefreshed = await prisma.finishedGoodsBatch.findUnique({ where: { fgBatchId: targetBatchId } });
    const transferRefreshed = await prisma.stockTransfer.findUnique({ where: { transferId: trfId } });

    console.log(`\n[Inter-Station Transfer Reversal DB Audit]`);
    console.log(`- Transfer Status: ${transferRefreshed?.status} (Cancel Reason: "${transferRefreshed?.cancelReason}")`);
    console.log(`- Source Station (${station1.name}) Batch Balance restored to: ${sourceBatchRefreshed?.availableQty} KG (Expected: 500 KG)`);
    console.log(`- Target Station (${station2.name}) Batch Balance decremented to: ${targetBatchRefreshed?.availableQty} KG (Expected: 0 KG)`);
    console.log(`- Balance Restoration Check: ${Number(sourceBatchRefreshed?.availableQty) === 500 && Number(targetBatchRefreshed?.availableQty) === 0 ? "✅ PASSED" : "❌ FAILED"}`);
  }

  // -------------------------------------------------------------
  // GAP 2B: Cancel Export Shipment (Pre-dispatch) Test
  // -------------------------------------------------------------
  console.log("\n--- GAP 2B: Export Shipment Cancellation (Pre-dispatch) Test ---");
  const customer = await prisma.customer.findFirst();
  const product = await prisma.product.findFirst();

  if (customer && product && station1) {
    const orderId = `ORD-TEST-${Date.now().toString().slice(-4)}`;
    const shipmentId = `SHP-TEST-${Date.now().toString().slice(-4)}`;
    const fgBatchId = `FG-SHP-TEST-${Date.now().toString().slice(-4)}`;

    // Create Client Order (1000 Kg, 0 unfulfilled initially as shipped)
    await prisma.clientOrder.create({
      data: {
        orderId,
        customerId: customer.id,
        productName: product.name,
        packagingSpec: "كرتونة 10 كجم تصدير",
        orderedQtyKg: 1000,
        unfulfilledQtyKg: 0,
        unitPriceEur: 1.8,
        fxRate: 53.5,
        status: "مكتملة بالكامل",
        createdById: userId,
      },
    });

    // Create Allocated Batch with 1000 Kg
    await prisma.finishedGoodsBatch.create({
      data: {
        fgBatchId,
        sourceType: "MANUFACTURED",
        stationId: station1.id,
        productName: product.name,
        productionDate: new Date(),
        initialQty: 1000,
        availableQty: 0, // 0 available because allocated to shipment
        costPerKg: 20,
        totalValue: 20000,
        createdById: userId,
      },
    });

    // Create Shipment Record without dispatchDate and status != 'تم الشحن والإبحار'
    await prisma.shipment.create({
      data: {
        shipmentId,
        order: { connect: { orderId } },
        customer: { connect: { id: customer.id } },
        productName: product.name,
        shippedQtyKg: 1000,
        containerNo: "MSCU-998877",
        sealNo: "SL-009988",
        shippingLine: "ميرسك للملاحة البحرية (Maersk Line)",
        productionCostEgp: 20000,
        totalShipmentCostEgp: 25000,
        sellingPriceEur: 1.8,
        fxRate: 53.5,
        grossRevenueEgp: 96300,
        netProfitEgp: 71300,
        marginPercent: 74.0,
        status: "قيد التجهيز بالمحطة", // Pre-dispatch status
        dispatchDate: null, // Pre-dispatch (not physically left yet)
        createdBy: { connect: { id: userId } },
        allocatedBatches: {
          create: [
            {
              fgBatchId,
              qtyKg: 1000,
              costPerKg: 20,
              totalCostEgp: 20000,
            },
          ],
        },
      },
    });

    console.log(`Created Pre-Dispatch Shipment ${shipmentId} for Order ${orderId} (1000 KG)`);

    // Execute Cancel Shipment Server Action
    const shpCancelRes = await cancelShipment(shipmentId, "إلغاء شحنة قبل خروجها من المحطة لإعادة فتح الطلبية واستعادة المنتج التام عبر Modal");
    console.log(`Cancel Shipment Server Action Output:`, shpCancelRes);

    // Verify DB state
    const orderRefreshed = await prisma.clientOrder.findUnique({ where: { orderId } });
    const fgBatchRefreshed = await prisma.finishedGoodsBatch.findUnique({ where: { fgBatchId } });
    const shipmentRefreshed = await prisma.shipment.findUnique({ where: { shipmentId } });

    console.log(`\n[Export Shipment Reversal DB Audit]`);
    console.log(`- Shipment Status: ${shipmentRefreshed?.status} (Cancel Reason: "${shipmentRefreshed?.cancelReason}")`);
    console.log(`- Client Order (${orderId}) Status reverted to: "${orderRefreshed?.status}"`);
    console.log(`- Client Order Unfulfilled Qty restored to: ${orderRefreshed?.unfulfilledQtyKg} KG (Expected: 1000 KG)`);
    console.log(`- Finished Goods Batch (${fgBatchId}) Available Qty restored to: ${fgBatchRefreshed?.availableQty} KG (Expected: 1000 KG)`);
    console.log(`- Pre-dispatch Reversal Check: ${orderRefreshed?.status === "قيد التنفيذ" && Number(fgBatchRefreshed?.availableQty) === 1000 ? "✅ PASSED" : "❌ FAILED"}`);
  }

  console.log("\n=================================================");
  console.log("✅ ALL GAP CLOSURE VERIFICATION TESTS COMPLETED");
  console.log("=================================================");
}

runGapClosureTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error running gap closure tests:", err);
    process.exit(1);
  });
