import { prisma } from "../lib/prisma";
import { ProductSchema } from "../lib/validations/product";
import { SupplySchema } from "../lib/validations/supply";
import { SupplierSchema } from "../lib/validations/supplier";
import { CustomerSchema, AgreementSchema } from "../lib/validations/customer";
import { RawArrivalSchema } from "../lib/validations/raw-arrival";
import { SupplierCategory, QcStatus } from "@prisma/client";

async function main() {
  console.log("🚀 Starting Master Database Seed (Milestones 01–09)...");

  // 1. Seed Stations (Milestone 03)
  console.log("\n--- Seeding Stations (Milestone 03) ---");
  const stationsData = [
    {
      id: "STN-01",
      name: "محطة النخيل",
      location: "البحيرة - البحيرة",
      coldStorageCapacityKg: 150000,
      electricityRatePerKg: 2.50,
      supervisorName: "م. أحمد محمود",
      phone: "01012345678",
    },
    {
      id: "STN-02",
      name: "محطة السلام",
      location: "الإسماعيلية - الإسماعيلية",
      coldStorageCapacityKg: 120000,
      electricityRatePerKg: 2.30,
      supervisorName: "م. مصطفى علي",
      phone: "01123456789",
    },
    {
      id: "STN-03",
      name: "محطة المدينة",
      location: "السادات - المنوفية",
      coldStorageCapacityKg: 200000,
      electricityRatePerKg: 2.60,
      supervisorName: "م. سامح إبراهيم",
      phone: "01234567890",
    },
  ];

  for (const stn of stationsData) {
    const station = await prisma.station.upsert({
      where: { id: stn.id },
      update: stn,
      create: stn,
    });
    console.log(`  ✅ Station: ${station.name} (${station.id})`);
  }

  // 2. Seed Contractors (Milestone 04)
  console.log("\n--- Seeding Contractors (Milestone 04) ---");
  const contractorsData = [
    {
      id: "CONT-001",
      name: "مقاول أحمد للتجهيز",
      stationId: "STN-01",
      tariffRatePerKg: 2.00,
      phone: "01099988811",
      specialization: "فرز وتجهيز وتجميد خضار",
    },
    {
      id: "CONT-002",
      name: "مقاول شركة الصفا",
      stationId: "STN-02",
      tariffRatePerKg: 2.20,
      phone: "01188877722",
      specialization: "تجهيز وتجميد فواكه",
    },
    {
      id: "CONT-003",
      name: "مقاول النور لفرز وتجميد الخضار",
      stationId: "STN-03",
      tariffRatePerKg: 1.90,
      phone: "01277766633",
      specialization: "فرز وتعبئة خضراوات وفواكه",
    },
  ];

  for (const ctr of contractorsData) {
    const contractor = await prisma.contractor.upsert({
      where: { id: ctr.id },
      update: ctr,
      create: ctr,
    });
    console.log(`  ✅ Contractor: ${contractor.name} (${contractor.id})`);
  }

  // 3. Seed Products Catalog (Milestone 05)
  console.log("\n--- Seeding Products Catalog (Milestone 05) ---");
  const productsData = [
    {
      id: "PRD-01",
      code: "PRD-STW-IQF",
      name: "فراولة مجمدة IQF",
      category: "فواكه مجمدة",
      defaultUnit: "KG",
      standardWastePct: 20.0,
      standardYieldPct: 80.0,
    },
    {
      id: "PRD-02",
      code: "PRD-STW-SLC",
      name: "فراولة شرائح مجمدة",
      category: "فواكه مجمدة",
      defaultUnit: "KG",
      standardWastePct: 22.0,
      standardYieldPct: 78.0,
    },
    {
      id: "PRD-03",
      code: "PRD-MNG-CBD",
      name: "مانجو مكعبات مجمدة",
      category: "فواكه مجمدة",
      defaultUnit: "KG",
      standardWastePct: 28.0,
      standardYieldPct: 72.0,
    },
    {
      id: "PRD-04",
      code: "PRD-OKR-EXT",
      name: "بامية ممتازة مجمدة",
      category: "خضار مجمد",
      defaultUnit: "KG",
      standardWastePct: 15.0,
      standardYieldPct: 85.0,
    },
  ];

  for (const prd of productsData) {
    const validated = ProductSchema.safeParse(prd);
    if (!validated.success) {
      console.error(`❌ Validation failed for product ${prd.id}:`, validated.error.flatten());
      process.exit(1);
    }
    const product = await prisma.product.upsert({
      where: { id: prd.id },
      update: prd,
      create: prd,
    });
    console.log(`  ✅ Product: ${product.name} (${product.code})`);
  }

  // 4. Seed Supplies & Packaging Catalog (Milestone 06)
  console.log("\n--- Seeding Supplies & Packaging Catalog (Milestone 06) ---");
  const suppliesData = [
    {
      id: "SUP-01",
      code: "CTN-EXP-10K",
      name: "كرتونة تصدير 10 كجم",
      category: "كرتونة",
      capacityKg: 10.0,
      unit: "كرتونة",
      stock: 2020.0,
      unitPrice: 18.0,
    },
    {
      id: "SUP-02",
      code: "BAG-POLY-10K",
      name: "كيس بوليثيلين 10 كجم",
      category: "أكياس",
      capacityKg: 10.0,
      unit: "كيس",
      stock: 3800.0,
      unitPrice: 3.5,
    },
    {
      id: "SUP-03",
      code: "PLT-WDN-FUM",
      name: "بالتات خشبية تبخير معتمد",
      category: "بالتات",
      capacityKg: null,
      unit: "باليتة",
      stock: 120.0,
      unitPrice: 450.0,
    },
    {
      id: "SUP-04",
      code: "TAP-WRD-72M",
      name: "شريط لاصق عريض",
      category: "لاصق",
      capacityKg: null,
      unit: "بكرة",
      stock: 85.0,
      unitPrice: 25.0,
    },
    {
      id: "SUP-05",
      code: "STR-RLL-23M",
      name: "رول استرتش",
      category: "تغليف",
      capacityKg: null,
      unit: "رول",
      stock: 40.0,
      unitPrice: 180.0,
    },
  ];

  for (const sup of suppliesData) {
    const validated = SupplySchema.safeParse(sup);
    if (!validated.success) {
      console.error(`❌ Validation failed for supply ${sup.id}:`, validated.error.flatten());
      process.exit(1);
    }
    const supply = await prisma.supply.upsert({
      where: { id: sup.id },
      update: sup,
      create: sup,
    });
    console.log(`  ✅ Supply: ${supply.name} (${supply.code})`);
  }

  // 5. Seed Suppliers Directory (Milestone 07)
  console.log("\n--- Seeding Suppliers Directory (Milestone 07) ---");
  const suppliersData = [
    {
      id: "SUPP-001",
      code: "SUPP-001",
      name: "مزارع الوادي الحديثة",
      type: SupplierCategory.RAW_AGRICULTURAL,
      mainProduct: "فراولة",
      location: "البحيرة",
      phone: "01011122233",
      status: "معتمد",
    },
    {
      id: "SUPP-002",
      code: "SUPP-002",
      name: "شركة الخير للتنمية",
      type: SupplierCategory.RAW_AGRICULTURAL,
      mainProduct: "مانجو",
      location: "الإسماعيلية",
      phone: "01122233344",
      status: "معتمد",
    },
    {
      id: "SUPP-003",
      code: "SUPP-003",
      name: "مزارع التوفيق",
      type: SupplierCategory.RAW_AGRICULTURAL,
      mainProduct: "فراولة وبامية",
      location: "القليوبية",
      phone: "01233344455",
      status: "معتمد",
    },
    {
      id: "SUPP-004",
      code: "SUPP-004",
      name: "شركة النيل للصناعات",
      type: SupplierCategory.FINISHED_GOODS,
      mainProduct: "فراولة مجمدة",
      location: "السادات",
      phone: "01044455566",
      status: "معتمد",
    },
    {
      id: "SUPP-005",
      code: "SUPP-005",
      name: "مزارع النوبارية",
      type: SupplierCategory.RAW_AGRICULTURAL,
      mainProduct: "فراولة",
      location: "النوبارية",
      phone: "01155566677",
      status: "معتمد",
    },
    {
      id: "SUPP-006",
      code: "SUPP-006",
      name: "الأهرام للتبريد",
      type: SupplierCategory.FINISHED_GOODS,
      mainProduct: "مانجو مجمد",
      location: "العاشر من رمضان",
      phone: "01266677788",
      status: "معتمد",
    },
    {
      id: "SUPP-007",
      code: "SUPP-007",
      name: "مزارع الشرقية",
      type: SupplierCategory.RAW_AGRICULTURAL,
      mainProduct: "بامية",
      location: "بلبيس",
      phone: "01077788899",
      status: "معتمد",
    },
    {
      id: "SUPP-008",
      code: "SUPP-008",
      name: "الشركة المصرية للكرتون",
      type: SupplierCategory.PACKAGING,
      mainProduct: "كرتون ومواد تغليف",
      location: "6 أكتوبر",
      phone: "01188899900",
      status: "معتمد",
    },
  ];

  for (const supp of suppliersData) {
    const validated = SupplierSchema.safeParse(supp);
    if (!validated.success) {
      console.error(`❌ Validation failed for supplier ${supp.id}:`, validated.error.flatten());
      process.exit(1);
    }
    const supplier = await prisma.supplier.upsert({
      where: { id: supp.id },
      update: supp,
      create: supp,
    });
    console.log(`  ✅ Supplier: ${supplier.name} (${supplier.code})`);
  }

  // 6. Seed Customers & Price Agreements (Milestone 08)
  console.log("\n--- Seeding Customers & Price Agreements (Milestone 08) ---");
  const customersData = [
    {
      id: "CUST-001",
      code: "CUST-SAMA-NL",
      name: "شركة سما للتجارة",
      country: "هولندا",
      currency: "EUR",
      paymentTerms: "30 يوماً من تاريخ التلغيم CAD",
      creditLimit: 500000.0,
      contactPerson: "Mr. Jan De Jong",
      phone: "+31 10 1234567",
      email: "import@sama-trading.nl",
      status: "نشط",
    },
    {
      id: "CUST-002",
      code: "CUST-NOOR-SA",
      name: "شركة النور للاستيراد",
      country: "السعودية",
      currency: "USD",
      paymentTerms: "دفعة مقدمة 50% الباقي عند الشحن",
      creditLimit: 350000.0,
      contactPerson: "الشيخ عبد الله السالم",
      phone: "+966 12 9876543",
      email: "info@alnoor-import.sa",
      status: "نشط",
    },
    {
      id: "CUST-003",
      code: "CUST-EURO-DE",
      name: "يوروفودز الدولية",
      country: "ألمانيا",
      currency: "EUR",
      paymentTerms: "اعتماد مستندي معزز LC",
      creditLimit: 750000.0,
      contactPerson: "Dr. Hans Mueller",
      phone: "+49 40 5554433",
      email: "orders@eurofoods.de",
      status: "نشط",
    },
  ];

  for (const cust of customersData) {
    const validated = CustomerSchema.safeParse(cust);
    if (!validated.success) {
      console.error(`❌ Validation failed for customer ${cust.id}:`, validated.error.flatten());
      process.exit(1);
    }
    const customer = await prisma.customer.upsert({
      where: { id: cust.id },
      update: cust,
      create: cust,
    });
    console.log(`  ✅ Customer: ${customer.name} (${customer.code})`);
  }

  const agreementsData = [
    {
      customerId: "CUST-001",
      productId: "PRD-01",
      targetPriceEur: 1.85,
      packagingSpec: "كرتونة تصدير 10 كجم",
    },
    {
      customerId: "CUST-002",
      productId: "PRD-03",
      targetPriceEur: 2.10,
      packagingSpec: "كرتونة 10 كجم",
    },
    {
      customerId: "CUST-003",
      productId: "PRD-04",
      targetPriceEur: 1.95,
      packagingSpec: "كرتونة 10 كجم",
    },
  ];

  for (const agr of agreementsData) {
    const validated = AgreementSchema.safeParse(agr);
    if (!validated.success) {
      console.error(`❌ Validation failed for agreement:`, validated.error.flatten());
      process.exit(1);
    }

    const existing = await prisma.customerAgreement.findUnique({
      where: {
        customerId_productId: {
          customerId: agr.customerId,
          productId: agr.productId,
        },
      },
    });

    if (existing) {
      await prisma.customerAgreement.update({
        where: { id: existing.id },
        data: agr,
      });
    } else {
      await prisma.customerAgreement.create({
        data: agr,
      });
    }
    console.log(`  ✅ Agreement: Customer ${agr.customerId} + Product ${agr.productId}`);
  }

  // 7. Seed Weighbridge Raw Batch (Milestone 09)
  console.log("\n--- Seeding Weighbridge Raw Batch (Milestone 09) ---");
  const rawBatchData = {
    stationId: "STN-01",
    supplierId: "SUPP-001",
    rawProduct: "فراولة خام",
    grossQtyKg: 5200.0,
    tareQtyKg: 200.0,
    unitPriceEgp: 19.50,
    transportCostEgp: 1000.0,
    brixDegree: 8.5,
    truckPlate: "أ ب ج 1234",
    driverName: "عمرو أحمد",
    notes: "حصول ممتاز - تبريد أولي",
  };

  const validatedRaw = RawArrivalSchema.safeParse(rawBatchData);
  if (!validatedRaw.success) {
    console.error("❌ Validation failed for raw batch:", validatedRaw.error.flatten());
    process.exit(1);
  }

  const netQty = rawBatchData.grossQtyKg - rawBatchData.tareQtyKg;
  const totalPayable = (netQty * rawBatchData.unitPriceEgp) + rawBatchData.transportCostEgp;
  const unitCost = totalPayable / netQty;

  const rawBatch = await prisma.rawBatch.upsert({
    where: { batchId: "LOT-RAW-001" },
    update: {
      stationId: rawBatchData.stationId,
      supplierId: rawBatchData.supplierId,
      rawProduct: rawBatchData.rawProduct,
      grossQtyKg: rawBatchData.grossQtyKg,
      tareQtyKg: rawBatchData.tareQtyKg,
      initialQty: netQty,
      availableQty: netQty,
      unitPriceEgp: rawBatchData.unitPriceEgp,
      transportCostEgp: rawBatchData.transportCostEgp,
      unitCost,
      totalPayableEgp: totalPayable,
      qcStatus: QcStatus.APPROVED,
      brixDegree: rawBatchData.brixDegree,
      truckPlate: rawBatchData.truckPlate,
      driverName: rawBatchData.driverName,
      notes: rawBatchData.notes,
    },
    create: {
      batchId: "LOT-RAW-001",
      stationId: rawBatchData.stationId,
      supplierId: rawBatchData.supplierId,
      rawProduct: rawBatchData.rawProduct,
      grossQtyKg: rawBatchData.grossQtyKg,
      tareQtyKg: rawBatchData.tareQtyKg,
      initialQty: netQty,
      availableQty: netQty,
      unitPriceEgp: rawBatchData.unitPriceEgp,
      transportCostEgp: rawBatchData.transportCostEgp,
      unitCost,
      totalPayableEgp: totalPayable,
      qcStatus: QcStatus.APPROVED,
      brixDegree: rawBatchData.brixDegree,
      truckPlate: rawBatchData.truckPlate,
      driverName: rawBatchData.driverName,
      notes: rawBatchData.notes,
    },
  });

  console.log(`  ✅ Raw Batch: ${rawBatch.batchId} (${rawBatch.initialQty} Kg)`);

  // 8. Seed Packaging Purchase & Direct Purchase Deal (Milestone 10)
  console.log("\n--- Seeding Packaging Purchase & Direct Purchase Deal (Milestone 10) ---");
  const cartonSupply = await prisma.supply.findFirst({ where: { code: "CTN-EXP-10K" } });
  const pkgSupplier = await prisma.supplier.findFirst({ where: { type: SupplierCategory.PACKAGING } });
  const finishedSupplier = await prisma.supplier.findFirst({ where: { type: SupplierCategory.FINISHED_GOODS } }) || pkgSupplier;

  if (cartonSupply && pkgSupplier) {
    const pkgPurchase = await prisma.packagingPurchase.upsert({
      where: { id: "PKG-PUR-SEED-01" },
      update: {
        supplyId: cartonSupply.id,
        supplierId: pkgSupplier.id,
        qty: 1000,
        unitPrice: 18.0,
        totalCost: 18000.0,
        invoiceNo: "INV-CTN-SEED-001",
      },
      create: {
        id: "PKG-PUR-SEED-01",
        supplyId: cartonSupply.id,
        supplierId: pkgSupplier.id,
        qty: 1000,
        unitPrice: 18.0,
        totalCost: 18000.0,
        invoiceNo: "INV-CTN-SEED-001",
      },
    });
    console.log(`  ✅ Packaging Purchase: ${pkgPurchase.invoiceNo} (1000 units @ 18.00 = 18000 EGP)`);
  }

  if (finishedSupplier) {
    const directDeal = await prisma.directPurchaseDeal.upsert({
      where: { dealId: "DEAL-SEED-001" },
      update: {
        supplierId: finishedSupplier.id,
        productName: "برتقال أبو سرة (فرز أول ممتاز)",
        stationId: "STN-01",
        qtyKg: 5000.0,
        packageType: "كرتونة 15 كجم - جامبو",
        purchasePricePerKg: 14.50,
        transportCost: 1500.0,
        totalCost: 74000.0,
        costPerKg: 14.80,
        notes: "صفقة شراء جاهز مباشرة شاملة الفرز والتعبئة",
      },
      create: {
        dealId: "DEAL-SEED-001",
        supplierId: finishedSupplier.id,
        productName: "برتقال أبو سرة (فرز أول ممتاز)",
        stationId: "STN-01",
        qtyKg: 5000.0,
        packageType: "كرتونة 15 كجم - جامبو",
        purchasePricePerKg: 14.50,
        transportCost: 1500.0,
        totalCost: 74000.0,
        costPerKg: 14.80,
        notes: "صفقة شراء جاهز مباشرة شاملة الفرز والتعبئة",
      },
    });
    console.log(`  ✅ Direct Purchase Deal: ${directDeal.dealId} (5000 Kg @ 14.50 + 1500 transport = 74000 EGP)`);
  }

  // 9. Seed Export Client Orders (Milestone 11)
  console.log("\n--- Seeding Export Client Orders (Milestone 11) ---");
  const ordersToSeed = [
    {
      orderId: "ORD-2026-001",
      customerId: "CUST-001",
      productName: "فراولة مجمدة IQF",
      packagingSpec: "كرتونة تصدير 10 كجم",
      orderedQtyKg: 10000.0,
      unfulfilledQtyKg: 10000.0,
      unitPriceEur: 1.85,
      fxRate: 53.20,
      status: "جديدة",
      notes: "طلبية موسمية أولى - هولندا",
    },
    {
      orderId: "ORD-2026-002",
      customerId: "CUST-002",
      productName: "مانجو مكعبات مجمدة",
      packagingSpec: "كرتونة 10 كجم",
      orderedQtyKg: 5000.0,
      unfulfilledQtyKg: 5000.0,
      unitPriceEur: 2.10,
      fxRate: 53.20,
      status: "جديدة",
      notes: "طلبية صيفية - المملكة العربية السعودية",
    },
    {
      orderId: "ORD-2026-003",
      customerId: "CUST-003",
      productName: "بامية ممتازة مجمدة",
      packagingSpec: "كرتونة 10 كجم",
      orderedQtyKg: 8000.0,
      unfulfilledQtyKg: 8000.0,
      unitPriceEur: 1.95,
      fxRate: 53.20,
      status: "جديدة",
      notes: "طلبية شتوية - ألمانيا",
    },
  ];

  for (const ord of ordersToSeed) {
    const custExists = await prisma.customer.findUnique({ where: { id: ord.customerId } });
    if (custExists) {
      const order = await prisma.clientOrder.upsert({
        where: { orderId: ord.orderId },
        update: ord,
        create: ord,
      });
      console.log(`  ✅ Client Order: ${order.orderId} (${order.productName} — ${order.orderedQtyKg} Kg)`);
    }
  }

  console.log("\n🎉 Master Database Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during master seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



