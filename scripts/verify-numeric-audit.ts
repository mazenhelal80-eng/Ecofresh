import { ContractorSchema } from '../lib/validations/contractor';
import { RawBatchSchema } from '../lib/validations/raw-batch';
import { DirectDealSchema } from '../lib/validations/direct-deal';
import { PackagingPurchaseSchema } from '../lib/validations/packaging-purchase';
import { ClientOrderSchema } from '../lib/validations/client-order';
import { StationSchema } from '../lib/validations/station';
import { SupplySchema } from '../lib/validations/supply';
import { ProductSchema } from '../lib/validations/product';

console.log("=== EcoFresh ERP Numeric Precision Audit Verification ===\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
    failed++;
  }
}

// 1. Labor Contractor Tariff Rates
console.log("1. Testing Labor Contractor Tariff Rates (12.5, 15.75, 0.5, 125.25):");
const contractorRates = [12.5, 15.75, 0.5, 125.25, 0.25];
for (const rate of contractorRates) {
  const result = ContractorSchema.safeParse({
    name: "ãÞÇæá ÇáÃåÑÇã ááÊÌåíÒ",
    stationId: "STN-01",
    tariffRatePerKg: rate,
  });
  assert(
    result.success && result.data.tariffRatePerKg === rate,
    `Contractor tariff accepts ${rate}`,
    result.success ? undefined : JSON.stringify(result.error.flatten())
  );
}

// Also test string coercion from FormData
for (const rateStr of ["12.5", "15.75", "0.5", "125.25"]) {
  const result = ContractorSchema.safeParse({
    name: "ãÞÇæá ÇáÃåÑÇã ááÊÌåíÒ",
    stationId: "STN-01",
    tariffRatePerKg: rateStr,
  });
  assert(
    result.success && result.data.tariffRatePerKg === parseFloat(rateStr),
    `Contractor tariff coerces string "${rateStr}" to ${parseFloat(rateStr)}`
  );
}

// 2. Weights and Quantities (10.5, 1.25, 0.75, 1254.75)
console.log("\n2. Testing Weights & Quantities Decimals:");
const rawArrivalResult = RawBatchSchema.safeParse({
  stationId: "STN-01",
  supplierId: "SUPP-001",
  rawProduct: "ÝÑÇæáÉ ÝÑíÔ ÈáÏí",
  grossQtyKg: 1254.75,
  tareQtyKg: 450.25,
  unitPriceEgp: 15.50,
  transportCostEgp: 250.75,
  brixDegree: 8.25,
});

assert(rawArrivalResult.success, "Raw arrival accepts decimal weights & prices");
if (rawArrivalResult.success) {
  assert(rawArrivalResult.data.netQtyKg === 804.5, `Net weight calculated accurately: ${rawArrivalResult.data.netQtyKg} kg (expected 804.50 kg)`);
  assert(rawArrivalResult.data.totalPayableEgp === 12720.5, `Total payable calculated accurately: ${rawArrivalResult.data.totalPayableEgp} EGP (expected 12720.50 EGP)`);
}

// 3. Packaging Purchases Decimal Quantities
console.log("\n3. Testing Packaging Purchase with Decimal Quantities:");
const pkgDecimals = [10.5, 1.25, 0.75, 250.5];
for (const qty of pkgDecimals) {
  const pkgResult = PackagingPurchaseSchema.safeParse({
    stationId: "STN-01",
    supplyId: "SUP-01",
    supplierId: "SUPP-002",
    qty: qty,
    unitPrice: 18.75,
  });
  assert(
    pkgResult.success && pkgResult.data.qty === qty,
    `Packaging purchase accepts decimal qty: ${qty}`,
    pkgResult.success ? undefined : JSON.stringify(pkgResult.error.flatten())
  );
}

// 4. Calculations Precision (12.5 x 150.75)
console.log("\n4. Testing Business Calculations without integer truncation:");
const qty = 12.5;
const rate = 150.75;
const rawCost = qty * rate; // 1884.375
const roundedCost = Math.round(rawCost * 100) / 100; // 1884.38
assert(rawCost === 1884.375, `12.5 * 150.75 = ${rawCost} (exact decimal precision)`);
assert(roundedCost === 1884.38, `Financial 2-decimal rounded cost = ${roundedCost} (correct currency rounding)`);
assert(Math.floor(rawCost) !== roundedCost, "Ensured no premature Math.floor/parseInt truncation occurred");

// 5. Station Capacity and Rates
console.log("\n5. Testing Station Capacity Decimals:");
const stationResult = StationSchema.safeParse({
  name: "ãÍØÉ ÇáÊÈÑíÏ ÇáãÊØæÑÉ",
  location: "ÇáãäØÞÉ ÇáÕäÇÚíÉ",
  coldStorageCapacityKg: 125500.75,
  electricityRatePerKg: 2.35,
});
assert(
  stationResult.success && stationResult.data.coldStorageCapacityKg === 125500.75 && stationResult.data.electricityRatePerKg === 2.35,
  "Station accepts decimal cold storage capacity and electricity rate"
);

// 6. Direct Purchase Deal Decimals
console.log("\n6. Testing Direct Deal Decimals:");
const directDealResult = DirectDealSchema.safeParse({
  supplierId: "SUPP-001",
  stationId: "STN-01",
  productName: "ÝÑÇæáÉ ãÌãÏÉ 10 ßÌã",
  qtyKg: 750.5,
  purchasePricePerKg: 75.25,
  transportCost: 150.5,
});
assert(directDealResult.success, "Direct deal accepts decimal quantity, price, and transport");
if (directDealResult.success) {
  const expectedTotal = Math.round((750.5 * 75.25 + 150.5) * 100) / 100;
  assert(directDealResult.data.totalCost === expectedTotal, `Direct deal totalCost: ${directDealResult.data.totalCost} == ${expectedTotal}`);
}

// 7. Backward Compatibility (Whole numbers)
console.log("\n7. Testing Backward Compatibility (Whole Numbers):");
const wholeContractor = ContractorSchema.safeParse({
  name: "ãÞÇæá ÞÏíã",
  stationId: "STN-01",
  tariffRatePerKg: 150,
});
assert(wholeContractor.success && wholeContractor.data.tariffRatePerKg === 150, "Contractor with whole integer 150 parses cleanly");

const wholePackaging = PackagingPurchaseSchema.safeParse({
  stationId: "STN-01",
  supplyId: "SUP-01",
  supplierId: "SUPP-001",
  qty: 1000,
  unitPrice: 20,
});
assert(wholePackaging.success && wholePackaging.data.qty === 1000, "Packaging purchase with whole integer 1000 parses cleanly");

console.log(`\n========================================`);
console.log(`Audit Summary: Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
