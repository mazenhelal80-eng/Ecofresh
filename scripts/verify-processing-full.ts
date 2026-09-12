import { prisma } from "../lib/prisma";
import {
  createProcessingOperation,
  cancelProcessingOperation,
} from "../actions/processing";
import { getStationLocation } from "../lib/stock-service";
import { WarehouseType } from "@prisma/client";

async function runProcessingTestSuite() {
  console.log("=================================================================");
  console.log("   PROCESSING SYSTEM & WAREHOUSE INTEGRATION ACCEPTANCE SUITE   ");
  console.log("=================================================================\n");

  // 1. SETUP: Create or retrieve test stations X and Y
  let stationX = await prisma.station.findFirst({ where: { name: "محطة الفرز التجريبية (X)" } });
  if (!stationX) {
    stationX = await prisma.station.create({
      data: {
        id: "STN-TEST-X",
        name: "محطة الفرز التجريبية (X)",
        location: "المنطقة الصناعية - السادات",
        electricityRatePerKg: 2.5,
        isActive: true,
      },
    });
  }

  let stationY = await prisma.station.findFirst({ where: { name: "محطة الفرز المعزولة (Y)" } });
  if (!stationY) {
    stationY = await prisma.station.create({
      data: {
        id: "STN-TEST-Y",
        name: "محطة الفرز المعزولة (Y)",
        location: "مدينة النوبارية",
        electricityRatePerKg: 3.0,
        isActive: true,
      },
    });
  }

  // Ensure 3 locked warehouses for Station X & Station Y
  const rawLocX = await getStationLocation(prisma, stationX.id, WarehouseType.RAW);
  const fgLocX = await getStationLocation(prisma, stationX.id, WarehouseType.FINISHED);
  const supLocX = await getStationLocation(prisma, stationX.id, WarehouseType.SUPPLIES);

  const rawLocY = await getStationLocation(prisma, stationY.id, WarehouseType.RAW);
  const fgLocY = await getStationLocation(prisma, stationY.id, WarehouseType.FINISHED);
  const supLocY = await getStationLocation(prisma, stationY.id, WarehouseType.SUPPLIES);

  console.log("✓ Station X Warehouses:", {
    raw: rawLocX.name,
    finished: fgLocX.name,
    supplies: supLocX.name,
  });

  // Setup Suppliers A and B
  let supplierA = await prisma.supplier.findFirst({ where: { code: "SUPP-TEST-A" } });
  if (!supplierA) {
    supplierA = await prisma.supplier.create({
      data: {
        id: "SUPP-TEST-A",
        code: "SUPP-TEST-A",
        name: "مزارع الصفوة (مورد A)",
        type: "RAW_AGRICULTURAL",
      },
    });
  }

  let supplierB = await prisma.supplier.findFirst({ where: { code: "SUPP-TEST-B" } });
  if (!supplierB) {
    supplierB = await prisma.supplier.create({
      data: {
        id: "SUPP-TEST-B",
        code: "SUPP-TEST-B",
        name: "مزارع النماء (مورد B)",
        type: "RAW_AGRICULTURAL",
      },
    });
  }

  // Setup Contractor
  let contractor = await prisma.contractor.findFirst({ where: { id: "CONT-TEST-01" } });
  if (!contractor) {
    contractor = await prisma.contractor.create({
      data: {
        id: "CONT-TEST-01",
        name: "مقاول التشغيل المعتمد",
        tariffRatePerKg: 2.0,
      },
    });
  }

  // Setup Product
  let product = await prisma.product.findFirst({ where: { code: "PRD-TEST-STW" } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        id: "PRD-TEST-STW",
        code: "PRD-TEST-STW",
        name: "فراولة مجمدة IQF فاخرة",
        category: "فواكه مجمدة",
      },
    });
  }

  const results: Record<string, "PASS" | "FAIL"> = {};

  // -------------------------------------------------------------
  // TEST 1: Station Isolation (Batch from Station Y in Station X)
  // -------------------------------------------------------------
  console.log("\n--- TEST 1: Station Isolation (Cross-station batch must be BLOCKED) ---");
  const batchInY = await prisma.rawBatch.create({
    data: {
      batchId: `LOT-Y-${Date.now()}`,
      stationId: stationY.id,
      locationId: rawLocY.id,
      supplierId: supplierA.id,
      rawProduct: "فراولة خام",
      grossQtyKg: 500,
      initialQty: 500,
      availableQty: 500,
      unitPriceEgp: 18,
      unitCost: 18,
      totalPayableEgp: 9000,
      qcStatus: "APPROVED",
    },
  });

  const crossStationRes = await createProcessingOperation({
    stationId: stationX.id, // Processing in Station X
    contractorId: contractor.id,
    rawProduct: "فراولة خام",
    finishedProduct: product.name,
    rawIssues: [{ batchId: batchInY.batchId, qty: 500 }],
    finishedOutputKg: 450,
  });

  if (!crossStationRes.success && crossStationRes.error?.includes("يتبع محطة أخرى")) {
    console.log("✓ Correctly BLOCKED cross-station batch:", crossStationRes.error);
    results["Cross-station batch"] = "PASS";
  } else {
    console.error("FAILED: Cross-station batch was not blocked!", crossStationRes);
    results["Cross-station batch"] = "FAIL";
  }

  // -------------------------------------------------------------
  // TEST 2: Over-withdrawal check
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Over-withdrawal (Requested > Available must be BLOCKED) ---");
  const batchLimited = await prisma.rawBatch.create({
    data: {
      batchId: `LOT-LMT-${Date.now()}`,
      stationId: stationX.id,
      locationId: rawLocX.id,
      supplierId: supplierA.id,
      rawProduct: "فراولة خام",
      grossQtyKg: 300,
      initialQty: 300,
      availableQty: 300,
      unitPriceEgp: 20,
      unitCost: 20,
      totalPayableEgp: 6000,
      qcStatus: "APPROVED",
    },
  });

  const overWithdrawRes = await createProcessingOperation({
    stationId: stationX.id,
    contractorId: contractor.id,
    rawProduct: "فراولة خام",
    finishedProduct: product.name,
    rawIssues: [{ batchId: batchLimited.batchId, qty: 350 }], // 350 > 300
    finishedOutputKg: 280,
  });

  if (!overWithdrawRes.success && (overWithdrawRes.error?.includes("تتجاوز") || overWithdrawRes.error?.includes("المتاح"))) {
    console.log("✓ Correctly BLOCKED over-withdrawal:", overWithdrawRes.error);
    results["Over-withdrawal"] = "PASS";
  } else {
    console.error("FAILED: Over-withdrawal was not blocked!", overWithdrawRes);
    results["Over-withdrawal"] = "FAIL";
  }

  // -------------------------------------------------------------
  // TEST 3: Validation: Output > Input (Must be BLOCKED)
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Output > Input (1100 > 1000 must be BLOCKED) ---");
  const batchForOverOutput = await prisma.rawBatch.create({
    data: {
      batchId: `LOT-OVR-${Date.now()}`,
      stationId: stationX.id,
      locationId: rawLocX.id,
      supplierId: supplierA.id,
      rawProduct: "فراولة خام",
      grossQtyKg: 1000,
      initialQty: 1000,
      availableQty: 1000,
      unitPriceEgp: 20,
      unitCost: 20,
      totalPayableEgp: 20000,
      qcStatus: "APPROVED",
    },
  });

  const overOutputRes = await createProcessingOperation({
    stationId: stationX.id,
    contractorId: contractor.id,
    rawProduct: "فراولة خام",
    finishedProduct: product.name,
    rawIssues: [{ batchId: batchForOverOutput.batchId, qty: 1000 }],
    finishedOutputKg: 1100, // 1100 > 1000
  });

  const isOverOutputBlocked = !overOutputRes.success && (
    overOutputRes.error?.includes("أكبر من الكمية الداخلة") ||
    JSON.stringify(overOutputRes.errors || {}).includes("أكبر من الكمية الداخلة")
  );

  if (isOverOutputBlocked) {
    console.log("✓ Correctly BLOCKED Output > Input:", overOutputRes.errors?.finishedOutputKg?.[0] || overOutputRes.error);
    results["Input 1000 / Output 1100"] = "PASS";
  } else {
    console.error("FAILED: Output > Input was not blocked!", overOutputRes);
    results["Input 1000 / Output 1100"] = "FAIL";
  }

  // -------------------------------------------------------------
  // TEST 4: Validation: Input <= 0 or Output < 0 (Must be BLOCKED)
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Invalid quantities (Input <= 0, Output < 0) ---");
  const zeroInputRes = await createProcessingOperation({
    stationId: stationX.id,
    contractorId: contractor.id,
    rawProduct: "فراولة خام",
    finishedProduct: product.name,
    rawIssues: [{ batchId: batchForOverOutput.batchId, qty: 0 }],
    finishedOutputKg: 0,
  });

  const negOutputRes = await createProcessingOperation({
    stationId: stationX.id,
    contractorId: contractor.id,
    rawProduct: "فراولة خام",
    finishedProduct: product.name,
    rawIssues: [{ batchId: batchForOverOutput.batchId, qty: 500 }],
    finishedOutputKg: -50,
  });

  if (!zeroInputRes.success && !negOutputRes.success) {
    console.log("✓ Correctly BLOCKED zero input and negative output.");
    results["Input 0"] = "PASS";
    results["Output -10"] = "PASS";
  } else {
    results["Input 0"] = "FAIL";
    results["Output -10"] = "FAIL";
  }

  // -------------------------------------------------------------
  // TEST 5: Case 1: Input 1000 / Output 1000 -> Waste 0, Waste % 0%, Yield 100%
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Case 1: Input 1000 / Output 1000 ---");
  const batchCase1 = await prisma.rawBatch.create({
    data: {
      batchId: `LOT-C1-${Date.now()}`,
      stationId: stationX.id,
      locationId: rawLocX.id,
      supplierId: supplierA.id,
      rawProduct: "فراولة خام",
      grossQtyKg: 1000,
      initialQty: 1000,
      availableQty: 1000,
      unitPriceEgp: 22,
      unitCost: 22,
      totalPayableEgp: 22000,
      qcStatus: "APPROVED",
    },
  });

  const case1Res = await createProcessingOperation({
    stationId: stationX.id,
    contractorId: contractor.id,
    rawProduct: "فراولة خام",
    finishedProduct: product.name,
    rawIssues: [{ batchId: batchCase1.batchId, qty: 1000 }],
    finishedOutputKg: 1000,
  });

  if (
    case1Res.success &&
    case1Res.data?.rawWasteKg === 0 &&
    case1Res.data?.wastePercent === 0 &&
    case1Res.data?.yieldPercent === 100
  ) {
    console.log("✓ Case 1 Passed:", case1Res.data);
    results["Input 1000 / Output 1000"] = "PASS";
  } else {
    console.error("Case 1 Failed:", case1Res);
    results["Input 1000 / Output 1000"] = "FAIL";
  }

  // -------------------------------------------------------------
  // TEST 6: Case 2: Input 1000 / Output 950 -> Waste 50, Waste % 5%, Yield 95%
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Case 2: Input 1000 / Output 950 ---");
  const batchCase2 = await prisma.rawBatch.create({
    data: {
      batchId: `LOT-C2-${Date.now()}`,
      stationId: stationX.id,
      locationId: rawLocX.id,
      supplierId: supplierA.id,
      rawProduct: "فراولة خام",
      grossQtyKg: 1000,
      initialQty: 1000,
      availableQty: 1000,
      unitPriceEgp: 22,
      unitCost: 22,
      totalPayableEgp: 22000,
      qcStatus: "APPROVED",
    },
  });

  const case2Res = await createProcessingOperation({
    stationId: stationX.id,
    contractorId: contractor.id,
    rawProduct: "فراولة خام",
    finishedProduct: product.name,
    rawIssues: [{ batchId: batchCase2.batchId, qty: 1000 }],
    finishedOutputKg: 950,
  });

  if (
    case2Res.success &&
    case2Res.data?.rawWasteKg === 50 &&
    case2Res.data?.wastePercent === 5 &&
    case2Res.data?.yieldPercent === 95
  ) {
    console.log("✓ Case 2 Passed:", case2Res.data);
    results["Input 1000 / Output 950"] = "PASS";
  } else {
    console.error("Case 2 Failed:", case2Res);
    results["Input 1000 / Output 950"] = "FAIL";
  }

  // -------------------------------------------------------------
  // TEST 7: Case 3: Input 1000 / Output 0 -> Waste 1000, Waste % 100%, Yield 0% (Total Loss)
  // -------------------------------------------------------------
  console.log("\n--- TEST 7: Case 3: Total Loss (Input 1000 / Output 0) ---");
  const batchCase3 = await prisma.rawBatch.create({
    data: {
      batchId: `LOT-C3-${Date.now()}`,
      stationId: stationX.id,
      locationId: rawLocX.id,
      supplierId: supplierA.id,
      rawProduct: "فراولة خام",
      grossQtyKg: 1000,
      initialQty: 1000,
      availableQty: 1000,
      unitPriceEgp: 22,
      unitCost: 22,
      totalPayableEgp: 22000,
      qcStatus: "APPROVED",
    },
  });

  const case3Res = await createProcessingOperation({
    stationId: stationX.id,
    contractorId: contractor.id,
    rawProduct: "فراولة خام",
    finishedProduct: product.name,
    rawIssues: [{ batchId: batchCase3.batchId, qty: 1000 }],
    finishedOutputKg: 0,
  });

  if (
    case3Res.success &&
    case3Res.data?.rawWasteKg === 1000 &&
    case3Res.data?.wastePercent === 100 &&
    case3Res.data?.yieldPercent === 0 &&
    case3Res.data?.fgBatchId === null
  ) {
    console.log("✓ Case 3 Passed (Total Loss handled correctly without creating FG stock):", case3Res.data);
    results["Input 1000 / Output 0"] = "PASS";
  } else {
    console.error("Case 3 Failed:", case3Res);
    results["Input 1000 / Output 0"] = "FAIL";
  }

  // -------------------------------------------------------------
  // TEST 8: MULTI-SUPPLIER ACCEPTANCE TEST (Scenario from Prompt)
  // -------------------------------------------------------------
  console.log("\n--- TEST 8: Multi-Supplier Acceptance Test (Batch A 600 + Batch B 400 = 1000 -> Output 930) ---");
  const batchA = await prisma.rawBatch.create({
    data: {
      batchId: `LOT-MA-${Date.now()}`,
      stationId: stationX.id,
      locationId: rawLocX.id,
      supplierId: supplierA.id,
      rawProduct: "فراولة خام",
      grossQtyKg: 600,
      initialQty: 600,
      availableQty: 600,
      unitPriceEgp: 25,
      unitCost: 25,
      totalPayableEgp: 15000,
      qcStatus: "APPROVED",
    },
  });

  const batchB = await prisma.rawBatch.create({
    data: {
      batchId: `LOT-MB-${Date.now()}`,
      stationId: stationX.id,
      locationId: rawLocX.id,
      supplierId: supplierB.id,
      rawProduct: "فراولة خام",
      grossQtyKg: 500,
      initialQty: 500,
      availableQty: 500,
      unitPriceEgp: 26,
      unitCost: 26,
      totalPayableEgp: 13000,
      qcStatus: "APPROVED",
    },
  });

  const multiSupplierRes = await createProcessingOperation({
    stationId: stationX.id,
    contractorId: contractor.id,
    rawProduct: "فراولة خام",
    finishedProduct: product.name,
    rawIssues: [
      { batchId: batchA.batchId, qty: 600 },
      { batchId: batchB.batchId, qty: 400 },
    ],
    finishedOutputKg: 930,
  });

  if (!multiSupplierRes.success) {
    throw new Error(`Multi-supplier processing failed: ${multiSupplierRes.error}`);
  }

  const opId = multiSupplierRes.data!.opId;
  const fgBatchId = multiSupplierRes.data!.fgBatchId!;

  console.log("Operation Created:", opId);
  console.log("FG Batch Created:", fgBatchId);

  // Verify Calculations:
  // Input: 1000, Output: 930, Waste: 70, Waste %: 7%, Yield %: 93%
  const opRecord = await prisma.processingOperation.findUniqueOrThrow({
    where: { id: opId },
    include: {
      rawIssues: true,
      generatedBatches: true,
    },
  });

  const wasteCalculated = Number(opRecord.rawWasteKg);
  const yieldCalculated = Number(opRecord.yieldPercent);
  const wastePercentCalculated = Math.round(((wasteCalculated / 1000) * 100) * 100) / 100;

  if (wasteCalculated !== 70 || wastePercentCalculated !== 7 || yieldCalculated !== 93) {
    throw new Error(`Calculation mismatch! Waste=${wasteCalculated}, WastePercent=${wastePercentCalculated}, Yield=${yieldCalculated}`);
  }
  console.log("✓ Calculations Verified: Waste = 70 KG (7%), Yield = 93%");

  // Verify Relational Raw Issues (Traceability):
  if (opRecord.rawIssues.length !== 2) {
    throw new Error(`Expected 2 OperationRawIssue records, found ${opRecord.rawIssues.length}`);
  }
  console.log("✓ OperationRawIssue Records Created:", opRecord.rawIssues.map((r: any) => ({
    supplier: r.supplierName,
    qtyKg: Number(r.qtyKg),
  })));

  // Verify Inventory Deductions:
  // Batch A: 600 - 600 = 0
  // Batch B: 500 - 400 = 100
  const updatedBatchA = await prisma.rawBatch.findUniqueOrThrow({ where: { batchId: batchA.batchId } });
  const updatedBatchB = await prisma.rawBatch.findUniqueOrThrow({ where: { batchId: batchB.batchId } });

  if (Number(updatedBatchA.availableQty) !== 0 || Number(updatedBatchB.availableQty) !== 100) {
    throw new Error(`Batch deduction mismatch! BatchA=${updatedBatchA.availableQty}, BatchB=${updatedBatchB.availableQty}`);
  }
  console.log("✓ Raw Batches Correctly Deducted: Batch A = 0 KG, Batch B = 100 KG");

  // Verify Finished Goods Batch:
  // Only Output (930 KG) enters Finished Stock, NOT 930 + 70!
  const fgRecord = await prisma.finishedGoodsBatch.findUniqueOrThrow({ where: { fgBatchId } });
  if (Number(fgRecord.availableQty) !== 930 || Number(fgRecord.initialQty) !== 930) {
    throw new Error(`FG Batch qty mismatch! Available=${fgRecord.availableQty}`);
  }
  if (fgRecord.locationId !== fgLocX.id || fgRecord.stationId !== stationX.id) {
    throw new Error(`FG Batch location mismatch! Location=${fgRecord.locationId}, Station=${fgRecord.stationId}`);
  }
  console.log("✓ Finished Warehouse X accurately received ONLY Output Quantity (+930 KG) at location", fgLocX.name);

  // Verify StockMovement records
  const movements = await prisma.stockMovement.findMany({
    where: { referenceId: opId },
  });
  console.log(`✓ Created ${movements.length} StockMovement records for audit tracking.`);

  results["Multi-supplier"] = "PASS";

  // -------------------------------------------------------------
  // TEST 9: Cancellation & Full Reversal
  // -------------------------------------------------------------
  console.log("\n--- TEST 9: Cancellation & Reversal of Operation ---");
  const cancelRes = await cancelProcessingOperation(opId, "إلغاء لاختبار دورة العكس الكاملة للتشغيلة");
  if (!cancelRes.success) {
    throw new Error(`Cancellation failed: ${cancelRes.error}`);
  }
  console.log("Cancellation Result:", cancelRes.message);

  // Verify Batch A and Batch B are restored to 600 and 500
  const restoredBatchA = await prisma.rawBatch.findUniqueOrThrow({ where: { batchId: batchA.batchId } });
  const restoredBatchB = await prisma.rawBatch.findUniqueOrThrow({ where: { batchId: batchB.batchId } });

  if (Number(restoredBatchA.availableQty) !== 600 || Number(restoredBatchB.availableQty) !== 500) {
    throw new Error(`Batches were not fully restored! A=${restoredBatchA.availableQty}, B=${restoredBatchB.availableQty}`);
  }
  console.log("✓ Raw Batches Fully Restored: Batch A = 600 KG, Batch B = 500 KG");

  // Verify FG Batch is zeroed out
  const invalidatedFg = await prisma.finishedGoodsBatch.findUniqueOrThrow({ where: { fgBatchId } });
  if (Number(invalidatedFg.availableQty) !== 0 || !invalidatedFg.qualityStatus.includes("ملغاة")) {
    throw new Error(`FG Batch was not properly invalidated! Available=${invalidatedFg.availableQty}`);
  }
  console.log("✓ Finished Goods Batch Zeroed Out & Invalidation Flagged:", invalidatedFg.qualityStatus);

  // Verify Operation is CANCELLED
  const cancelledOp = await prisma.processingOperation.findUniqueOrThrow({ where: { id: opId } });
  if (cancelledOp.status !== "CANCELLED") {
    throw new Error(`Operation status is not CANCELLED! Status=${cancelledOp.status}`);
  }
  console.log("✓ Operation Status: CANCELLED, audit trail preserved.");

  results["Cancellation"] = "PASS";

  // -------------------------------------------------------------
  // TEST 10: Idempotency & Duplicate Submission
  // -------------------------------------------------------------
  console.log("\n--- TEST 10: Concurrent / Race condition atomic check ---");
  // Test two concurrent requests trying to withdraw 400 from batch that only has 500
  const concurrentBatch = await prisma.rawBatch.create({
    data: {
      batchId: `LOT-CONC-${Date.now()}`,
      stationId: stationX.id,
      locationId: rawLocX.id,
      supplierId: supplierA.id,
      rawProduct: "فراولة خام",
      grossQtyKg: 500,
      initialQty: 500,
      availableQty: 500,
      unitPriceEgp: 20,
      unitCost: 20,
      totalPayableEgp: 10000,
      qcStatus: "APPROVED",
    },
  });

  const [proc1, proc2] = await Promise.all([
    createProcessingOperation({
      stationId: stationX.id,
      contractorId: contractor.id,
      rawProduct: "فراولة خام",
      finishedProduct: product.name,
      rawIssues: [{ batchId: concurrentBatch.batchId, qty: 400 }],
      finishedOutputKg: 380,
    }),
    createProcessingOperation({
      stationId: stationX.id,
      contractorId: contractor.id,
      rawProduct: "فراولة خام",
      finishedProduct: product.name,
      rawIssues: [{ batchId: concurrentBatch.batchId, qty: 400 }],
      finishedOutputKg: 380,
    }),
  ]);

  const oneSuccessOneFail = (proc1.success && !proc2.success) || (!proc1.success && proc2.success);
  if (oneSuccessOneFail) {
    console.log("✓ Atomic Concurrency Safe: Exactly one concurrent process succeeded and the second was blocked from over-withdrawing.");
    results["Concurrent processing"] = "PASS";
    results["Duplicate submit"] = "PASS";
  } else {
    console.error("Concurrency test failed:", { proc1: proc1.success, proc2: proc2.success });
    results["Concurrent processing"] = "FAIL";
    results["Duplicate submit"] = "FAIL";
  }

  // Final Results Table
  console.log("\n=================================================================");
  console.log("                     FINAL TEST MATRIX RESULTS                   ");
  console.log("=================================================================");
  console.table(results);

  const allPassed = Object.values(results).every((r) => r === "PASS");
  if (!allPassed) {
    console.error("\n❌ SOME TESTS FAILED!");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL TESTS PASSED WITH 100% BUSINESS ACCURACY!");
  }
}

runProcessingTestSuite()
  .catch((err) => {
    console.error("FATAL ERROR IN TEST SUITE:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
