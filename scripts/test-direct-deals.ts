import { prisma } from '@/lib/prisma';
import { addDirectPurchaseDeal, cancelDirectPurchaseDeal } from '@/actions/direct-deals';
import { WarehouseType } from '@prisma/client';
import assert from 'assert';

async function runDirectDealsTests() {
  console.log('====================================================');
  console.log('🧪 Starting Comprehensive Direct Deals Audit & Fix Tests');
  console.log('====================================================\n');

  // Setup: Find or create required entities
  const supplier = await prisma.supplier.findFirst({
    where: { status: 'معتمد' },
  });
  assert(supplier, 'An active supplier must exist in the database');

  const stations = await prisma.station.findMany({
    where: { isActive: true },
    take: 2,
  });
  assert(stations.length >= 2, 'At least 2 active stations must exist in the database');
  const stationA = stations[0];
  const stationB = stations[1];

  const product = await prisma.product.findFirst();
  assert(product, 'A product must exist in the database');

  const treasuryAccount = await prisma.treasuryAccount.findFirst({
    where: { isActive: true, balance: { gte: 10000 } },
  });
  assert(treasuryAccount, 'An active treasury account with at least 10,000 EGP balance must exist');

  console.log(`📌 Test Context:`);
  console.log(`   - Supplier: ${supplier.name} (${supplier.id})`);
  console.log(`   - Station A: ${stationA.name} (${stationA.id})`);
  console.log(`   - Station B: ${stationB.name} (${stationB.id})`);
  console.log(`   - Product: ${product.name} (${product.id})`);
  console.log(`   - Treasury: ${treasuryAccount.name} (Balance: ${treasuryAccount.balance})\n`);

  // ----------------------------------------------------
  // CASE 1: Standard Purchase (Credit Only)
  // ----------------------------------------------------
  console.log('--- [CASE 1] Standard Purchase (100% Credit) ---');
  const case1SubId = 'TEST-CASE-1-' + Date.now();
  const case1Res = await addDirectPurchaseDeal({
    submissionId: case1SubId,
    supplierId: supplier.id,
    stationId: stationA.id,
    productName: product.name,
    qtyKg: 1000,
    purchasePricePerKg: 15.50,
    transportCost: 500,
    date: '2026-09-12',
    notes: 'صفقة تجريبية كيس 1',
  });

  assert(case1Res.success, `Case 1 failed: ${case1Res.error}`);
  console.log(`  ✅ Case 1 Registered: ${case1Res.message}`);

  // Verify Deal Record
  const deal1 = await prisma.directPurchaseDeal.findFirst({
    where: { notes: { contains: case1SubId } },
  });
  assert(deal1, 'Deal 1 must exist in database');
  assert(Number(deal1.totalCost) === 16000, `Deal 1 totalCost must be 16000, got: ${deal1.totalCost}`);
  assert(deal1.date.toISOString().startsWith('2026-09-12'), `Deal 1 date must match input date, got: ${deal1.date}`);

  // Verify Finished Goods Batch
  const batch1 = await prisma.finishedGoodsBatch.findUnique({
    where: { fgBatchId: deal1.generatedBatchId! },
  });
  assert(batch1, 'FinishedGoodsBatch must be created');
  assert(batch1.stationId === stationA.id, 'Batch must belong to Station A');
  assert(Number(batch1.availableQty) === 1000, `Batch availableQty must be 1000, got: ${batch1.availableQty}`);
  assert(batch1.sourceType === 'DIRECT_PURCHASE', 'Batch sourceType must be DIRECT_PURCHASE');

  // Verify StockMovement
  const movement1 = await prisma.stockMovement.findFirst({
    where: { referenceId: deal1.dealId, itemType: WarehouseType.FINISHED },
  });
  assert(movement1, 'StockMovement must be recorded for Finished Goods');
  assert(Number(movement1.qty) === 1000, 'Movement qty must be 1000');
  assert(movement1.destinationLocationId === batch1.locationId, 'Movement destination must match batch location');

  // Verify AP Financial Transaction
  const apTxn1 = await prisma.financialTransaction.findFirst({
    where: { refDoc: deal1.dealId, type: 'استحقاق شراء صفقة جاهزة (AP)', status: { not: 'ملغاة' } },
  });
  assert(apTxn1, 'AP Financial Transaction must exist');
  assert(Number(apTxn1.amountEgp) === 16000, `AP Transaction amount must be 16000, got: ${apTxn1.amountEgp}`);
  console.log(`  ✅ Case 1 Verified: Deal, Batch (${batch1.fgBatchId}), StockMovement, and AP Accrual (+16,000 EGP) are intact.\n`);

  // ----------------------------------------------------
  // CASE 2: Decimal Precision (Weights and Fractional Prices)
  // ----------------------------------------------------
  console.log('--- [CASE 2] Decimal Precision (1000.75 Kg @ 15.50 + 150.25 Transport) ---');
  const case2SubId = 'TEST-CASE-2-' + Date.now();
  const case2Res = await addDirectPurchaseDeal({
    submissionId: case2SubId,
    supplierId: supplier.id,
    stationId: stationA.id,
    productName: product.name,
    qtyKg: 1000.75,
    purchasePricePerKg: 15.50,
    transportCost: 150.25,
    date: '2026-09-12',
    notes: 'صفقة تجريبية كيس 2 - كسور عشرية',
  });

  assert(case2Res.success, `Case 2 failed: ${case2Res.error}`);
  const deal2 = await prisma.directPurchaseDeal.findFirst({
    where: { notes: { contains: case2SubId } },
  });
  assert(deal2, 'Deal 2 must exist');
  const expectedTotal2 = Math.round((1000.75 * 15.50 + 150.25) * 100) / 100;
  assert(Number(deal2.qtyKg) === 1000.75, `Qty must be exactly 1000.75, got: ${deal2.qtyKg}`);
  assert(Number(deal2.totalCost) === expectedTotal2, `Total cost must be ${expectedTotal2}, got: ${deal2.totalCost}`);

  const batch2 = await prisma.finishedGoodsBatch.findUnique({
    where: { fgBatchId: deal2.generatedBatchId! },
  });
  assert(batch2 && Number(batch2.initialQty) === 1000.75, 'FG batch must hold exact decimal quantity 1000.75');
  console.log(`  ✅ Case 2 Verified: Exact decimal precision retained (${deal2.qtyKg} Kg = ${deal2.totalCost} EGP).\n`);

  // ----------------------------------------------------
  // CASE 3: Idempotency Protection (Double Submit)
  // ----------------------------------------------------
  console.log('--- [CASE 3] Idempotency Protection (Double Submit with same submissionId) ---');
  const dealsCountBefore = await prisma.directPurchaseDeal.count();
  const batchesCountBefore = await prisma.finishedGoodsBatch.count();
  const movementsCountBefore = await prisma.stockMovement.count();
  const txnsCountBefore = await prisma.financialTransaction.count();

  // Re-submit Case 2 with same submissionId
  const case3Res = await addDirectPurchaseDeal({
    submissionId: case2SubId,
    supplierId: supplier.id,
    stationId: stationA.id,
    productName: product.name,
    qtyKg: 1000.75,
    purchasePricePerKg: 15.50,
    transportCost: 150.25,
    date: '2026-09-12',
    notes: 'إعادة إرسال مكررة',
  });

  assert(case3Res.success, 'Duplicate call should succeed gracefully');
  assert(case3Res.message?.includes('مسجلة مسبقاً'), `Expected message to state already registered, got: ${case3Res.message}`);

  const dealsCountAfter = await prisma.directPurchaseDeal.count();
  const batchesCountAfter = await prisma.finishedGoodsBatch.count();
  const movementsCountAfter = await prisma.stockMovement.count();
  const txnsCountAfter = await prisma.financialTransaction.count();

  assert(dealsCountBefore === dealsCountAfter, 'Deals count must not increase on duplicate submit');
  assert(batchesCountBefore === batchesCountAfter, 'Batches count must not increase on duplicate submit');
  assert(movementsCountBefore === movementsCountAfter, 'Movements count must not increase on duplicate submit');
  assert(txnsCountBefore === txnsCountAfter, 'Financial txns count must not increase on duplicate submit');
  console.log('  ✅ Case 3 Verified: Duplicate submission intercepted; zero duplicate records created.\n');

  // ----------------------------------------------------
  // CASE 4: Purchase with Instant Partial Payment from Treasury
  // ----------------------------------------------------
  console.log('--- [CASE 4] Purchase with Instant Partial Payment from Treasury ---');
  const treasuryInitialBal = Number((await prisma.treasuryAccount.findUniqueOrThrow({ where: { id: treasuryAccount.id } })).balance);
  const case4SubId = 'TEST-CASE-4-' + Date.now();
  const dealTotal4 = 10000; // 500 Kg @ 20.00
  const paidAmount4 = 4000;

  const case4Res = await addDirectPurchaseDeal({
    submissionId: case4SubId,
    supplierId: supplier.id,
    stationId: stationA.id,
    productName: product.name,
    qtyKg: 500,
    purchasePricePerKg: 20.00,
    transportCost: 0,
    date: '2026-09-12',
    isPaidNow: true,
    paidAmount: paidAmount4,
    treasuryAccountId: treasuryAccount.id,
    notes: 'صفقة تجريبية كيس 4 - سداد جزئي فوري',
  });

  assert(case4Res.success, `Case 4 failed: ${case4Res.error}`);
  const deal4 = await prisma.directPurchaseDeal.findFirst({
    where: { notes: { contains: case4SubId } },
  });
  assert(deal4, 'Deal 4 must exist');

  // Verify Treasury Balance decremented
  const treasuryAfterBal = Number((await prisma.treasuryAccount.findUniqueOrThrow({ where: { id: treasuryAccount.id } })).balance);
  assert(treasuryAfterBal === treasuryInitialBal - paidAmount4, `Treasury balance must decrement by ${paidAmount4}, was ${treasuryInitialBal}, now ${treasuryAfterBal}`);

  // Verify 2 Financial Transactions (AP Accrual and Payment Outflow)
  const apTxn4 = await prisma.financialTransaction.findFirst({
    where: { refDoc: deal4.dealId, type: 'استحقاق شراء صفقة جاهزة (AP)', status: { not: 'ملغاة' } },
  });
  const payTxn4 = await prisma.financialTransaction.findFirst({
    where: { refDoc: deal4.dealId, type: 'سداد لمورد جاهز', status: { not: 'ملغاة' } },
  });

  assert(apTxn4 && Number(apTxn4.amountEgp) === 10000, 'AP Accrual must be 10,000');
  assert(payTxn4 && Number(payTxn4.amountEgp) === 4000, 'Payment Outflow must be 4,000');
  assert(payTxn4.accountId === treasuryAccount.id, 'Payment must be tied to treasury account');

  console.log(`  ✅ Case 4 Verified: Purchase (10,000 EGP) + Instant Payment (4,000 EGP) recorded atomically; Treasury updated.\n`);

  // ----------------------------------------------------
  // CASE 5: Safe Cancellation & Rollback
  // ----------------------------------------------------
  console.log('--- [CASE 5] Safe Deal Cancellation & Reversal ---');
  const cancelRes = await cancelDirectPurchaseDeal(deal4.dealId, 'إلغاء تجريبي لاختبار التراجع');
  assert(cancelRes.success, `Cancel failed: ${cancelRes.error}`);

  // Verify Deal status is 'ملغاة'
  const deal4Refreshed = await prisma.directPurchaseDeal.findUniqueOrThrow({ where: { dealId: deal4.dealId } });
  assert(deal4Refreshed.status === 'ملغاة', `Deal status must be ملغاة, got: ${deal4Refreshed.status}`);

  // Verify Finished Goods Batch is zeroed out and marked 'ملغاة'
  const batch4Refreshed = await prisma.finishedGoodsBatch.findUniqueOrThrow({ where: { fgBatchId: deal4.generatedBatchId! } });
  assert(Number(batch4Refreshed.availableQty) === 0, `Batch availableQty must be 0, got: ${batch4Refreshed.availableQty}`);
  assert(batch4Refreshed.qualityStatus === 'ملغاة', `Batch status must be ملغاة, got: ${batch4Refreshed.qualityStatus}`);

  // Verify Reversal StockMovement logged
  const reversalMov = await prisma.stockMovement.findFirst({
    where: { referenceId: deal4.dealId, movementType: 'REVERSAL_OUT' },
  });
  assert(reversalMov, 'Reversal StockMovement must be logged');
  assert(Number(reversalMov.qty) === 500, 'Reversal qty must be 500');

  // Verify Treasury Refund
  const treasuryRefundBal = Number((await prisma.treasuryAccount.findUniqueOrThrow({ where: { id: treasuryAccount.id } })).balance);
  assert(treasuryRefundBal === treasuryInitialBal, `Treasury balance must be restored to ${treasuryInitialBal}, got: ${treasuryRefundBal}`);

  // Verify Financial Transactions marked 'ملغاة'
  const activeTxnsAfterCancel = await prisma.financialTransaction.findMany({
    where: { refDoc: deal4.dealId, status: { not: 'ملغاة' } },
  });
  assert(activeTxnsAfterCancel.length === 0, 'No active financial transactions should remain after cancellation');
  console.log('  ✅ Case 5 Verified: Deal cancelled, Batch zeroed, StockMovement reversed, Treasury refunded, Transactions marked cancelled.\n');

  // ----------------------------------------------------
  // CASE 6: Multi-Station Stock Isolation
  // ----------------------------------------------------
  console.log('--- [CASE 6] Multi-Station Stock Isolation ---');
  const case6Sub1 = 'TEST-CASE-6A-' + Date.now();
  const case6Sub2 = 'TEST-CASE-6B-' + Date.now();

  const dealStationA = await addDirectPurchaseDeal({
    submissionId: case6Sub1,
    supplierId: supplier.id,
    stationId: stationA.id,
    productName: product.name,
    qtyKg: 250,
    purchasePricePerKg: 10,
    transportCost: 0,
    date: '2026-09-12',
  });
  assert(dealStationA.success, 'Station A deal must succeed');

  const dealStationB = await addDirectPurchaseDeal({
    submissionId: case6Sub2,
    supplierId: supplier.id,
    stationId: stationB.id,
    productName: product.name,
    qtyKg: 350,
    purchasePricePerKg: 10,
    transportCost: 0,
    date: '2026-09-12',
  });
  assert(dealStationB.success, 'Station B deal must succeed');

  const batchStationA = await prisma.finishedGoodsBatch.findFirst({
    where: { stationId: stationA.id, deal: { notes: { contains: case6Sub1 } } },
  });
  const batchStationB = await prisma.finishedGoodsBatch.findFirst({
    where: { stationId: stationB.id, deal: { notes: { contains: case6Sub2 } } },
  });

  assert(batchStationA && Number(batchStationA.availableQty) === 250, 'Station A batch must have 250 Kg');
  assert(batchStationB && Number(batchStationB.availableQty) === 350, 'Station B batch must have 350 Kg');
  assert(batchStationA.locationId !== batchStationB.locationId, 'Locations must be distinct');
  console.log('  ✅ Case 6 Verified: Stock cleanly separated across stations with separate stock locations.\n');

  console.log('====================================================');
  console.log('🎉 ALL 6 AUDIT & BUSINESS SCENARIOS PASSED WITH 100% SUCCESS!');
  console.log('====================================================');
}

runDirectDealsTests()
  .catch((e) => {
    console.error('❌ Test failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
