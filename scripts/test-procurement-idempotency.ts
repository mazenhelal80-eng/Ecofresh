import fs from 'fs';
import path from 'path';
import { PrismaClient, WarehouseType } from '@prisma/client';
import { addRawMaterialArrival } from '../actions/raw-batches';
import { addPackagingPurchase } from '../actions/packaging-purchases';

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*"(.*)"\s*$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  });
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function runTests() {
  console.log('====================================================');
  console.log('   PROCUREMENT & RECEIVING AUDIT & IDEMPOTENCY TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`[PASS] ${msg} ${detail ? `(${detail})` : ''}`);
    } else {
      failed++;
      console.error(`[FAIL] ${msg} ${detail ? `(${detail})` : ''}`);
    }
  }

  try {
    const station = await prisma.station.findFirstOrThrow({ where: { isActive: true } });
    const rawSupplier = await prisma.supplier.findFirst({ where: { type: 'RAW_AGRICULTURAL' } }) || await prisma.supplier.findFirstOrThrow();
    const pkgSupplier = await prisma.supplier.findFirst({ where: { type: 'PACKAGING' } }) || await prisma.supplier.findFirstOrThrow();
    const supply = await prisma.supply.findFirstOrThrow();

    console.log(`Using Station: ${station.name} (${station.id})`);
    console.log(`Using Raw Supplier: ${rawSupplier.name} (${rawSupplier.id})`);
    console.log(`Using Pkg Supplier: ${pkgSupplier.name} (${pkgSupplier.id})`);
    console.log(`Using Supply: ${supply.name} (${supply.id})\n`);

    // =========================================================================
    // PART 1: RAW RECEIVING (Tests A, B, C, D, E, F, G)
    // =========================================================================
    console.log('--- TESTING RAW RECEIVING FLOW ---');
    const submissionIdRaw = `TEST-SUB-RAW-${Date.now()}`;
    const truckPlate = `TRK-${Date.now().toString().slice(-4)}`;

    const initialRawTxns = await prisma.financialTransaction.findMany({
      where: { partyId: rawSupplier.id, status: { not: 'ملغاة' } },
    });
    const initialRawBalance = initialRawTxns.reduce((sum, t) => sum + (Number(t.credit) - Number(t.debit)), 0);

    console.log('\n[Test A, B, F, G] Submitting New Raw Arrival with Decimal Qty: 12.5 and Price: 150.75...');
    const res1 = await addRawMaterialArrival({
      stationId: station.id,
      supplierId: rawSupplier.id,
      rawProduct: 'فراولة خام تصدير',
      grossQtyKg: 20.0,
      tareQtyKg: 7.5,
      unitPriceEgp: 150.75,
      transportCostEgp: 0,
      receivedDate: new Date().toISOString().substring(0, 10),
      truckPlate,
      submissionId: submissionIdRaw,
    });

    assert(res1.success, 'Test A & B: New Raw Material Arrival created successfully', `Batch: ${res1.data?.batchId}`);
    assert(!res1.data?.isExisting, 'Test B: First submission generated a new lot');

    const batchId1 = res1.data?.batchId!;
    const batchDb1 = await prisma.rawBatch.findUnique({ where: { batchId: batchId1 } });
    assert(!!batchDb1, 'Test B: RawBatch record exists in database');
    assert(Number(batchDb1?.initialQty) === 12.5, 'Test F: Net quantity is exactly decimal 12.5 KG', `Got ${batchDb1?.initialQty}`);
    assert(Number(batchDb1?.totalPayableEgp) === 1884.38 || Number(batchDb1?.totalPayableEgp) === 1884.375, 'Test G: Total payable reflects exact decimal math (1884.38 EGP)', `Got ${batchDb1?.totalPayableEgp}`);

    const movements1 = await prisma.stockMovement.findMany({ where: { rawBatchId: batchId1 } });
    assert(movements1.length === 1, 'Test B: Exactly 1 StockMovement was created for the new lot');
    assert(Number(movements1[0].qty) === 12.5, 'Test B: StockMovement quantity is 12.5 KG');

    const financialTxns1 = await prisma.financialTransaction.findMany({
      where: { relatedEntityType: 'RAW_BATCH', relatedEntityId: batchId1 },
    });
    assert(financialTxns1.length === 1, 'Test D: Exactly 1 AP Financial Transaction was created');
    assert(financialTxns1[0].type === 'استحقاق توريد خام (AP)', 'Test D: Transaction type is AP Accrual');

    const afterRawTxns = await prisma.financialTransaction.findMany({
      where: { partyId: rawSupplier.id, status: { not: 'ملغاة' } },
    });
    const afterRawBalance = afterRawTxns.reduce((sum, t) => sum + (Number(t.credit) - Number(t.debit)), 0);
    const balanceDiff = afterRawBalance - initialRawBalance;
    assert(Math.abs(balanceDiff - 1884.38) < 0.1 || Math.abs(balanceDiff - 1884.375) < 0.1, 'Test D: Supplier balance increased by exactly payable amount (~1884.38 EGP)', `Diff: ${balanceDiff}`);

    console.log('\n[Test C, E] Submitting the SAME Raw Arrival again (Simulating Click 2 & 3)...');
    const res2 = await addRawMaterialArrival({
      stationId: station.id,
      supplierId: rawSupplier.id,
      rawProduct: 'فراولة خام تصدير',
      grossQtyKg: 20.0,
      tareQtyKg: 7.5,
      unitPriceEgp: 150.75,
      transportCostEgp: 0,
      receivedDate: new Date().toISOString().substring(0, 10),
      truckPlate,
      submissionId: submissionIdRaw,
    });

    assert(res2.success, 'Test C: Repeated submission handled safely with success');
    assert(res2.data?.isExisting === true, 'Test C: System recognized existing batch and marked isExisting: true');
    assert(res2.data?.batchId === batchId1, 'Test C: Returned the SAME batchId without creating a duplicate lot');

    const allBatchesForPlate = await prisma.rawBatch.findMany({ where: { truckPlate } });
    assert(allBatchesForPlate.length === 1, 'Test C: Total batches for this truck arrival remains exactly 1 (NO DUPLICATE LOT)');

    const movementsAfterRetry = await prisma.stockMovement.findMany({ where: { rawBatchId: batchId1 } });
    assert(movementsAfterRetry.length === 1, 'Test C: Total StockMovements remains exactly 1 (NO DUPLICATE MOVEMENT)');

    const txnsAfterRetry = await prisma.financialTransaction.findMany({
      where: { relatedEntityType: 'RAW_BATCH', relatedEntityId: batchId1 },
    });
    assert(txnsAfterRetry.length === 1, 'Test E: Total FinancialTransactions remains exactly 1 (NO DUPLICATE AP ENTRY)');

    const finalRawTxns = await prisma.financialTransaction.findMany({
      where: { partyId: rawSupplier.id, status: { not: 'ملغاة' } },
    });
    const finalRawBalance = finalRawTxns.reduce((sum, t) => sum + (Number(t.credit) - Number(t.debit)), 0);
    assert(finalRawBalance === afterRawBalance, 'Test E: Supplier balance did NOT double on repeat click (100% IDEMPOTENT)');

    // =========================================================================
    // PART 2: SUPPLIES PURCHASES (Tests H, I, J, K, L, M, N)
    // =========================================================================
    console.log('\n--- TESTING SUPPLIES PURCHASES FLOW ---');
    const invoiceNo = `INV-TEST-${Date.now().toString().slice(-5)}`;
    const submissionIdPkg = `TEST-SUB-PKG-${Date.now()}`;

    const suppliesLoc = await prisma.stockLocation.findUniqueOrThrow({
      where: { stationId_type: { stationId: station.id, type: WarehouseType.SUPPLIES } },
    });
    const initialStationSupply = await prisma.stationSupply.findUnique({
      where: { locationId_supplyId: { locationId: suppliesLoc.id, supplyId: supply.id } },
    });
    const initialStock = Number(initialStationSupply?.stock || 0);

    console.log('\n[Test H, I, K, M, N] Submitting Supplies Purchase with Decimal Qty: 12.5 and Price: 150.75...');
    const pkgRes1 = await addPackagingPurchase({
      stationId: station.id,
      supplyId: supply.id,
      supplierId: pkgSupplier.id,
      qty: 12.5,
      unitPrice: 150.75,
      invoiceNo,
      submissionId: submissionIdPkg,
    });

    assert(pkgRes1.success, 'Test H & I: Supplies Purchase registered successfully', pkgRes1.message);

    const updatedStationSupply = await prisma.stationSupply.findUnique({
      where: { locationId_supplyId: { locationId: suppliesLoc.id, supplyId: supply.id } },
    });
    const stockAfter1 = Number(updatedStationSupply?.stock || 0);
    assert(Math.abs(stockAfter1 - (initialStock + 12.5)) < 0.01, 'Test M: Station stock increased by exactly 12.5 units', `Stock was ${initialStock}, now ${stockAfter1}`);

    const movementsPkg1 = await prisma.stockMovement.findMany({
      where: { referenceId: invoiceNo },
    });
    assert(movementsPkg1.length === 1, 'Test I: Exactly 1 StockMovement logged for the purchase');
    assert(Number(movementsPkg1[0].qty) === 12.5, 'Test M: StockMovement logged decimal quantity 12.5');

    const txnsPkg1 = await prisma.financialTransaction.findMany({
      where: { relatedEntityType: 'PACKAGING_PURCHASE', relatedEntityId: invoiceNo },
    });
    assert(txnsPkg1.length === 1, 'Test K: Exactly 1 AP Financial Transaction created for purchase');
    assert(Number(txnsPkg1[0].amountEgp) === 1884.38 || Number(txnsPkg1[0].amountEgp) === 1884.375, 'Test N: Payable amount is 1884.38 EGP (12.5 * 150.75)');

    console.log('\n[Test J, L] Submitting the SAME Supplies Purchase again (Simulating Click 2)...');
    const pkgRes2 = await addPackagingPurchase({
      stationId: station.id,
      supplyId: supply.id,
      supplierId: pkgSupplier.id,
      qty: 12.5,
      unitPrice: 150.75,
      invoiceNo,
      submissionId: submissionIdPkg,
    });

    assert(Boolean(!pkgRes2.success || pkgRes2.message?.includes('مسبقاً')), 'Test J: Duplicate purchase prevented or recognized safely');

    const stockAfterRetry = await prisma.stationSupply.findUnique({
      where: { locationId_supplyId: { locationId: suppliesLoc.id, supplyId: supply.id } },
    });
    assert(Number(stockAfterRetry?.stock) === stockAfter1, 'Test J: Station Stock did NOT double on duplicate click (Remains +12.5)');

    const txnsPkgAfterRetry = await prisma.financialTransaction.findMany({
      where: { relatedEntityType: 'PACKAGING_PURCHASE', relatedEntityId: invoiceNo },
    });
    assert(txnsPkgAfterRetry.length === 1, 'Test L: Financial Transactions remain exactly 1 (NO DUPLICATE AP ENTRY)');

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

  } catch (err: any) {
    console.error('Fatal test error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
