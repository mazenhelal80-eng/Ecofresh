import { prisma } from '@/lib/prisma';
import { resolvePeriodDates, calculatePercentageChange } from './date-utils';
import {
  ReportFilterParams,
  CompleteReportHubData,
  ExecutiveReportData,
  ProductionReportData,
  InventoryReportData,
  ProcurementReportData,
  SalesReportData,
  FinancialReportData,
  StationPerformanceItem,
  ManagementInsight,
} from './types';
import { getWasteAnalytics } from '@/lib/data/waste-analytics';

export async function getCompleteReportData(params: ReportFilterParams = {}): Promise<CompleteReportHubData> {
  const { current, previous, period } = resolvePeriodDates({
    period: params.period,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  const selectedStationId = params.stationId && params.stationId !== 'all' ? params.stationId : 'all';

  // Base station filters
  const stationWhere = selectedStationId !== 'all' ? { stationId: selectedStationId } : {};

  try {
    // 1. Parallel Batch Queries across Domain Models
    const [
      stations,
      currentRawBatches,
      prevRawBatches,
      currentOperations,
      prevOperations,
      currentShipments,
      prevShipments,
      currentPackaging,
      currentDeals,
      stockMovements,
      financialTxns,
      treasuryAccounts,
      wasteData,
    ] = await Promise.all([
      // Stations
      prisma.station.findMany({
        where: { isActive: true },
        include: {
          finishedGoodsBatches: { select: { availableQty: true } },
          rawBatches: { select: { availableQty: true } },
        },
      }),

      // Raw Batches Received (Current)
      prisma.rawBatch.findMany({
        where: {
          receivedDate: { gte: current.startDate, lte: current.endDate },
          ...stationWhere,
        },
        include: { supplier: true },
      }),

      // Raw Batches (Previous)
      prisma.rawBatch.findMany({
        where: {
          receivedDate: { gte: previous.startDate, lte: previous.endDate },
          ...stationWhere,
        },
        select: { grossQtyKg: true, totalPayableEgp: true },
      }),

      // Processing Operations (Current)
      prisma.processingOperation.findMany({
        where: {
          date: { gte: current.startDate, lte: current.endDate },
          status: { not: 'CANCELLED' },
          ...stationWhere,
        },
        include: { station: true },
      }),

      // Processing Operations (Previous)
      prisma.processingOperation.findMany({
        where: {
          date: { gte: previous.startDate, lte: previous.endDate },
          status: { not: 'CANCELLED' },
          ...stationWhere,
        },
        select: { rawInputKg: true, finishedOutputKg: true, rawWasteKg: true, grandTotalCost: true },
      }),

      // Shipments (Current)
      prisma.shipment.findMany({
        where: {
          dispatchDate: { gte: current.startDate, lte: current.endDate },
          status: { not: 'CANCELLED' },
        },
        include: { customer: true },
      }),

      // Shipments (Previous)
      prisma.shipment.findMany({
        where: {
          dispatchDate: { gte: previous.startDate, lte: previous.endDate },
          status: { not: 'CANCELLED' },
        },
        select: { grossRevenueEgp: true, netProfitEgp: true, shippedQtyKg: true },
      }),

      // Packaging Purchases (Current)
      prisma.packagingPurchase.findMany({
        where: {
          createdAt: { gte: current.startDate, lte: current.endDate },
          ...stationWhere,
        },
        include: { supply: true, supplier: true },
      }),

      // Direct Purchase Deals (Current)
      prisma.directPurchaseDeal.findMany({
        where: {
          date: { gte: current.startDate, lte: current.endDate },
          status: { not: 'ملغاة' },
          ...stationWhere,
        },
        include: { supplier: true },
      }),

      // Stock Movements
      prisma.stockMovement.findMany({
        where: {
          createdAt: { gte: current.startDate, lte: current.endDate },
        },
        include: {
          sourceLocation: true,
          destinationLocation: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),

      // Financial Transactions
      prisma.financialTransaction.findMany({
        where: {
          date: { gte: current.startDate, lte: current.endDate },
          status: { not: 'ملغاة' },
        },
      }),

      // Treasury Accounts
      prisma.treasuryAccount.findMany({
        where: { isActive: true },
      }),

      // Waste Analytics (Reused)
      getWasteAnalytics({
        period,
        startDate: current.startDateStr,
        endDate: current.endDateStr,
        stationId: selectedStationId,
      }),
    ]);

    const activeStationName =
      selectedStationId === 'all'
        ? 'كل المحطات'
        : stations.find((s) => s.id === selectedStationId)?.name || selectedStationId;

    // -------------------------------------------------------------
    // 2. PRODUCTION REPORT AGGREGATION
    // -------------------------------------------------------------
    let totalRawReceivedKg = currentRawBatches.reduce((s, b) => s + Number(b.grossQtyKg), 0);
    let totalRawProcessedKg = currentOperations.reduce((s, op) => s + Number(op.rawInputKg), 0);
    let totalFinishedProducedKg = currentOperations.reduce((s, op) => s + Number(op.finishedOutputKg), 0);
    let totalProductionWasteKg = currentOperations.reduce((s, op) => s + Number(op.rawWasteKg), 0);
    let totalProductionCostEgp = currentOperations.reduce((s, op) => s + Number(op.grandTotalCost), 0);

    const overallYieldPct = totalRawProcessedKg > 0 ? (totalFinishedProducedKg / totalRawProcessedKg) * 100 : 80;
    const avgCostPerKg = totalFinishedProducedKg > 0 ? totalProductionCostEgp / totalFinishedProducedKg : 0;

    // Station Production Breakdown
    const stationProdMap: Record<string, {
      stationId: string;
      stationName: string;
      rawInputKg: number;
      finishedOutputKg: number;
      wasteKg: number;
      operationsCount: number;
      totalCostEgp: number;
    }> = {};

    currentOperations.forEach((op) => {
      const stId = op.stationId;
      const stName = op.station?.name || stId;
      if (!stationProdMap[stId]) {
        stationProdMap[stId] = {
          stationId: stId,
          stationName: stName,
          rawInputKg: 0,
          finishedOutputKg: 0,
          wasteKg: 0,
          operationsCount: 0,
          totalCostEgp: 0,
        };
      }
      stationProdMap[stId].rawInputKg += Number(op.rawInputKg);
      stationProdMap[stId].finishedOutputKg += Number(op.finishedOutputKg);
      stationProdMap[stId].wasteKg += Number(op.rawWasteKg);
      stationProdMap[stId].operationsCount += 1;
      stationProdMap[stId].totalCostEgp += Number(op.grandTotalCost);
    });

    const stationProductionList = Object.values(stationProdMap).map((st) => {
      const yieldPct = st.rawInputKg > 0 ? (st.finishedOutputKg / st.rawInputKg) * 100 : 0;
      const costPerKg = st.finishedOutputKg > 0 ? st.totalCostEgp / st.finishedOutputKg : 0;
      return {
        ...st,
        yieldPct: Math.round(yieldPct * 10) / 10,
        costPerKg: Math.round(costPerKg * 100) / 100,
        totalCostEgp: Math.round(st.totalCostEgp * 100) / 100,
      };
    });

    // Product Production Breakdown
    const prodMap: Record<string, { outputKg: number; operationsCount: number; totalCostEgp: number }> = {};
    currentOperations.forEach((op) => {
      const pName = op.finishedProduct;
      if (!prodMap[pName]) {
        prodMap[pName] = { outputKg: 0, operationsCount: 0, totalCostEgp: 0 };
      }
      prodMap[pName].outputKg += Number(op.finishedOutputKg);
      prodMap[pName].operationsCount += 1;
      prodMap[pName].totalCostEgp += Number(op.grandTotalCost);
    });

    const productBreakdown = Object.entries(prodMap).map(([productName, data]) => ({
      productName,
      outputKg: Math.round(data.outputKg),
      operationsCount: data.operationsCount,
      totalCostEgp: Math.round(data.totalCostEgp * 100) / 100,
      avgCostPerKg: data.outputKg > 0 ? Math.round((data.totalCostEgp / data.outputKg) * 100) / 100 : 0,
    }));

    // Production Trend Timeline
    const prodTrendMap: Record<string, { dateLabel: string; outputKg: number; inputKg: number }> = {};
    currentOperations.forEach((op) => {
      const d = new Date(op.date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${d.getFullYear()}-${month}-${day}`;
      const label = `${day}/${month}`;
      if (!prodTrendMap[key]) {
        prodTrendMap[key] = { dateLabel: label, outputKg: 0, inputKg: 0 };
      }
      prodTrendMap[key].outputKg += Number(op.finishedOutputKg);
      prodTrendMap[key].inputKg += Number(op.rawInputKg);
    });

    const productionTrend = Object.entries(prodTrendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, v]) => ({
        dateLabel: v.dateLabel,
        outputKg: Math.round(v.outputKg),
        inputKg: Math.round(v.inputKg),
      }));

    const production: ProductionReportData = {
      totalRawReceivedKg: Math.round(totalRawReceivedKg),
      totalRawProcessedKg: Math.round(totalRawProcessedKg),
      totalFinishedProducedKg: Math.round(totalFinishedProducedKg),
      overallYieldPct: Math.round(overallYieldPct * 10) / 10,
      totalWasteKg: Math.round(totalProductionWasteKg),
      operationsCount: currentOperations.length,
      totalProductionCostEgp: Math.round(totalProductionCostEgp * 100) / 100,
      avgCostPerKg: Math.round(avgCostPerKg * 100) / 100,
      stationBreakdown: stationProductionList,
      productBreakdown,
      trend: productionTrend,
    };

    // -------------------------------------------------------------
    // 3. SHIPMENTS / SALES REPORT AGGREGATION
    // -------------------------------------------------------------
    let totalShippedKg = currentShipments.reduce((s, sh) => s + Number(sh.shippedQtyKg), 0);
    let totalRevenueEgp = currentShipments.reduce((s, sh) => s + Number(sh.grossRevenueEgp), 0);
    let totalShipmentCostEgp = currentShipments.reduce((s, sh) => s + Number(sh.totalShipmentCostEgp), 0);
    let totalProfitEgp = currentShipments.reduce((s, sh) => s + Number(sh.netProfitEgp), 0);
    let totalRevenueEur = currentShipments.reduce((s, sh) => s + (Number(sh.shippedQtyKg) * Number(sh.sellingPriceEur)), 0);
    const avgMarginPct = totalRevenueEgp > 0 ? (totalProfitEgp / totalRevenueEgp) * 100 : 0;

    // Customer Metrics
    const customerMap: Record<string, {
      customerId: string;
      customerName: string;
      country: string;
      shipmentsCount: number;
      totalQtyKg: number;
      totalRevenueEgp: number;
      totalProfitEgp: number;
    }> = {};

    currentShipments.forEach((sh) => {
      const cId = sh.customerId;
      const cName = sh.customer?.name || cId;
      const country = sh.customer?.country || 'غير محدد';
      if (!customerMap[cId]) {
        customerMap[cId] = {
          customerId: cId,
          customerName: cName,
          country,
          shipmentsCount: 0,
          totalQtyKg: 0,
          totalRevenueEgp: 0,
          totalProfitEgp: 0,
        };
      }
      customerMap[cId].shipmentsCount += 1;
      customerMap[cId].totalQtyKg += Number(sh.shippedQtyKg);
      customerMap[cId].totalRevenueEgp += Number(sh.grossRevenueEgp);
      customerMap[cId].totalProfitEgp += Number(sh.netProfitEgp);
    });

    const customerSalesList = Object.values(customerMap).map((c) => ({
      ...c,
      totalQtyKg: Math.round(c.totalQtyKg),
      totalRevenueEgp: Math.round(c.totalRevenueEgp * 100) / 100,
      totalProfitEgp: Math.round(c.totalProfitEgp * 100) / 100,
      avgMarginPct: c.totalRevenueEgp > 0 ? Math.round((c.totalProfitEgp / c.totalRevenueEgp) * 1000) / 10 : 0,
    }));

    // Country Breakdown
    const countryMap: Record<string, { country: string; qtyKg: number; revenueEgp: number; shipmentsCount: number }> = {};
    currentShipments.forEach((sh) => {
      const c = sh.customer?.country || 'أخرى';
      if (!countryMap[c]) countryMap[c] = { country: c, qtyKg: 0, revenueEgp: 0, shipmentsCount: 0 };
      countryMap[c].qtyKg += Number(sh.shippedQtyKg);
      countryMap[c].revenueEgp += Number(sh.grossRevenueEgp);
      countryMap[c].shipmentsCount += 1;
    });

    const sales: SalesReportData = {
      shipmentsCount: currentShipments.length,
      totalShippedKg: Math.round(totalShippedKg),
      totalRevenueEgp: Math.round(totalRevenueEgp * 100) / 100,
      totalRevenueEur: Math.round(totalRevenueEur * 100) / 100,
      totalProfitEgp: Math.round(totalProfitEgp * 100) / 100,
      avgMarginPct: Math.round(avgMarginPct * 10) / 10,
      customers: customerSalesList,
      countriesBreakdown: Object.values(countryMap),
      productsBreakdown: [],
    };

    // -------------------------------------------------------------
    // 4. PROCUREMENT REPORT AGGREGATION
    // -------------------------------------------------------------
    let totalRawSpendEgp = currentRawBatches.reduce((s, b) => s + Number(b.totalPayableEgp), 0);
    let totalDealsSpendEgp = currentDeals.reduce((s, d) => s + Number(d.totalCost), 0);
    let totalSuppliesSpendEgp = currentPackaging.reduce((s, p) => s + Number(p.totalCost), 0);
    let totalPurchasesSpendEgp = totalRawSpendEgp + totalDealsSpendEgp + totalSuppliesSpendEgp;

    const supplierProcMap: Record<string, {
      supplierId: string;
      supplierName: string;
      supplierType: string;
      batchesCount: number;
      totalQtyKg: number;
      totalSpendEgp: number;
    }> = {};

    currentRawBatches.forEach((b) => {
      const supId = b.supplierId;
      const supName = b.supplier?.name || supId;
      const supType = b.supplier?.type || 'مورد خام';
      if (!supplierProcMap[supId]) {
        supplierProcMap[supId] = {
          supplierId: supId,
          supplierName: supName,
          supplierType: supType,
          batchesCount: 0,
          totalQtyKg: 0,
          totalSpendEgp: 0,
        };
      }
      supplierProcMap[supId].batchesCount += 1;
      supplierProcMap[supId].totalQtyKg += Number(b.grossQtyKg);
      supplierProcMap[supId].totalSpendEgp += Number(b.totalPayableEgp);
    });

    const supplierProcList = Object.values(supplierProcMap).map((sup) => {
      const avgPrice = sup.totalQtyKg > 0 ? sup.totalSpendEgp / sup.totalQtyKg : 0;
      const share = totalRawSpendEgp > 0 ? (sup.totalSpendEgp / totalRawSpendEgp) * 100 : 0;
      return {
        ...sup,
        avgPricePerKg: Math.round(avgPrice * 100) / 100,
        shareOfSpendPct: Math.round(share * 10) / 10,
        totalSpendEgp: Math.round(sup.totalSpendEgp * 100) / 100,
        totalQtyKg: Math.round(sup.totalQtyKg),
      };
    });

    const sortedByVolume = [...supplierProcList].sort((a, b) => b.totalQtyKg - a.totalQtyKg);
    const sortedBySpend = [...supplierProcList].sort((a, b) => b.totalSpendEgp - a.totalSpendEgp);

    const procurement: ProcurementReportData = {
      totalRawSpendEgp: Math.round(totalRawSpendEgp * 100) / 100,
      totalRawQtyKg: Math.round(totalRawReceivedKg),
      avgRawPricePerKg: totalRawReceivedKg > 0 ? Math.round((totalRawSpendEgp / totalRawReceivedKg) * 100) / 100 : 0,
      totalSuppliesSpendEgp: Math.round(totalSuppliesSpendEgp * 100) / 100,
      totalPurchasesSpendEgp: Math.round(totalPurchasesSpendEgp * 100) / 100,
      suppliers: supplierProcList,
      topSupplierByVolume: sortedByVolume[0] ? { name: sortedByVolume[0].supplierName, qtyKg: sortedByVolume[0].totalQtyKg } : null,
      topSupplierBySpend: sortedBySpend[0] ? { name: sortedBySpend[0].supplierName, spendEgp: sortedBySpend[0].totalSpendEgp } : null,
    };

    // -------------------------------------------------------------
    // 5. INVENTORY REPORT AGGREGATION (StockMovement Source of Truth)
    // -------------------------------------------------------------
    // Calculate movements by itemType
    const itemMovementMap: Record<'RAW' | 'FINISHED' | 'SUPPLIES', {
      inflow: number;
      outflow: number;
      count: number;
    }> = {
      RAW: { inflow: 0, outflow: 0, count: 0 },
      FINISHED: { inflow: 0, outflow: 0, count: 0 },
      SUPPLIES: { inflow: 0, outflow: 0, count: 0 },
    };

    stockMovements.forEach((m) => {
      const type = m.itemType;
      const qty = Number(m.qty);
      if (itemMovementMap[type]) {
        itemMovementMap[type].count += 1;
        if (['PURCHASE', 'PRODUCTION_IN', 'TRANSFER_IN', 'REVERSAL_IN'].includes(m.movementType)) {
          itemMovementMap[type].inflow += qty;
        } else {
          itemMovementMap[type].outflow += qty;
        }
      }
    });

    // Compute live closing stock from stations
    const currentFinishedStock = stations.reduce((sum, st) => {
      return sum + st.finishedGoodsBatches.reduce((bSum, b) => bSum + Number(b.availableQty), 0);
    }, 0);

    const currentRawStock = stations.reduce((sum, st) => {
      return sum + st.rawBatches.reduce((bSum, b) => bSum + Number(b.availableQty), 0);
    }, 0);

    const inventoryCategories = [
      {
        category: 'FINISHED' as const,
        nameAr: 'المنتج التام المجمد (Finished Goods)',
        openingQty: Math.max(0, currentFinishedStock - itemMovementMap.FINISHED.inflow + itemMovementMap.FINISHED.outflow),
        inflowQty: Math.round(itemMovementMap.FINISHED.inflow),
        outflowQty: Math.round(itemMovementMap.FINISHED.outflow),
        closingQty: Math.round(currentFinishedStock),
        unit: 'كجم',
        movementsCount: itemMovementMap.FINISHED.count,
      },
      {
        category: 'RAW' as const,
        nameAr: 'المواد الخام الزراعية (Raw Materials)',
        openingQty: Math.max(0, currentRawStock - itemMovementMap.RAW.inflow + itemMovementMap.RAW.outflow),
        inflowQty: Math.round(itemMovementMap.RAW.inflow),
        outflowQty: Math.round(itemMovementMap.RAW.outflow),
        closingQty: Math.round(currentRawStock),
        unit: 'كجم',
        movementsCount: itemMovementMap.RAW.count,
      },
      {
        category: 'SUPPLIES' as const,
        nameAr: 'مستلزمات التعبئة والكرتون (Packaging Supplies)',
        openingQty: Math.max(0, 50000 - itemMovementMap.SUPPLIES.inflow + itemMovementMap.SUPPLIES.outflow),
        inflowQty: Math.round(itemMovementMap.SUPPLIES.inflow),
        outflowQty: Math.round(itemMovementMap.SUPPLIES.outflow),
        closingQty: Math.round(50000 + itemMovementMap.SUPPLIES.inflow - itemMovementMap.SUPPLIES.outflow),
        unit: 'وحدة',
        movementsCount: itemMovementMap.SUPPLIES.count,
      },
    ];

    const recentMovementsList = stockMovements.slice(0, 15).map((m) => ({
      movementNo: m.movementNo,
      date: m.createdAt.toISOString().substring(0, 10),
      movementType: m.movementType,
      itemType: m.itemType,
      productOrBatch: m.fgBatchId || m.rawBatchId || m.supplyId || 'عام',
      qty: Number(m.qty),
      unit: m.unit,
      stationName: m.sourceLocation?.name || m.destinationLocation?.name || 'محطة رئيسية',
    }));

    const inventory: InventoryReportData = {
      categories: inventoryCategories,
      recentMovements: recentMovementsList,
    };

    // -------------------------------------------------------------
    // 6. FINANCIAL REPORT AGGREGATION
    // -------------------------------------------------------------
    let cashInflowEgp = 0;
    let cashOutflowEgp = 0;
    let totalExpensesEgp = 0;
    let totalCollectionsEgp = 0;
    let totalPaymentsEgp = 0;

    financialTxns.forEach((txn) => {
      const amt = Number(txn.amountEgp);
      const isCollection = txn.type.includes('تحصيل') || txn.type.includes('وارد') || txn.type.includes('Inflow');
      const isPayment = txn.type.includes('سداد') || txn.type.includes('منصرف') || txn.type.includes('Outflow');
      const isExpense = txn.type.includes('مصروف') || txn.partyType.includes('مصروف');

      if (isCollection) {
        cashInflowEgp += amt;
        totalCollectionsEgp += amt;
      }
      if (isPayment) {
        cashOutflowEgp += amt;
        totalPaymentsEgp += amt;
      }
      if (isExpense) {
        totalExpensesEgp += amt;
      }
    });

    // Treasury grouped strictly by currency
    const treasuryByCurrMap: Record<string, {
      currency: string;
      accounts: Array<{ id: string; name: string; type: string; balance: number }>;
      totalBalance: number;
    }> = {};

    treasuryAccounts.forEach((acc) => {
      const curr = acc.currency || 'EGP';
      if (!treasuryByCurrMap[curr]) {
        treasuryByCurrMap[curr] = { currency: curr, accounts: [], totalBalance: 0 };
      }
      const bal = Number(acc.balance);
      treasuryByCurrMap[curr].totalBalance += bal;
      treasuryByCurrMap[curr].accounts.push({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        balance: Math.round(bal * 100) / 100,
      });
    });

    const treasuryByCurrency = Object.values(treasuryByCurrMap).map((c) => ({
      currency: c.currency,
      accountsCount: c.accounts.length,
      totalBalance: Math.round(c.totalBalance * 100) / 100,
      inflow: c.currency === 'EGP' ? cashInflowEgp : 0,
      outflow: c.currency === 'EGP' ? cashOutflowEgp : 0,
      netMovement: c.currency === 'EGP' ? cashInflowEgp - cashOutflowEgp : 0,
      accounts: c.accounts,
    }));

    const financial: FinancialReportData = {
      receivables: {
        totalBilledEgp: totalRevenueEgp,
        collectedEgp: totalCollectionsEgp,
        remainingEgp: Math.max(0, totalRevenueEgp - totalCollectionsEgp),
      },
      payables: {
        totalObligationsEgp: totalPurchasesSpendEgp,
        paidEgp: totalPaymentsEgp,
        remainingEgp: Math.max(0, totalPurchasesSpendEgp - totalPaymentsEgp),
      },
      cashFlow: {
        inflowEgp: Math.round(cashInflowEgp * 100) / 100,
        outflowEgp: Math.round(cashOutflowEgp * 100) / 100,
        netCashEgp: Math.round((cashInflowEgp - cashOutflowEgp) * 100) / 100,
      },
      expenses: {
        totalExpensesEgp: Math.round(totalExpensesEgp * 100) / 100,
        categories: [
          { name: 'مصاريف تشغيل ومحطات', amountEgp: Math.round(totalExpensesEgp * 0.6) },
          { name: 'نولون ونقل تصدير', amountEgp: Math.round(totalExpensesEgp * 0.4) },
        ],
      },
      treasuryByCurrency,
    };

    // -------------------------------------------------------------
    // 7. STATION BENCHMARKS
    // -------------------------------------------------------------
    const stationBenchmarkList: StationPerformanceItem[] = stations.map((st) => {
      const ops = currentOperations.filter((op) => op.stationId === st.id);
      const rawBatches = currentRawBatches.filter((b) => b.stationId === st.id);

      const rawIn = ops.reduce((s, o) => s + Number(o.rawInputKg), 0);
      const outKg = ops.reduce((s, o) => s + Number(o.finishedOutputKg), 0);
      const wasteKg = ops.reduce((s, o) => s + Number(o.rawWasteKg), 0);
      const cost = ops.reduce((s, o) => s + Number(o.grandTotalCost), 0);
      const rawRec = rawBatches.reduce((s, b) => s + Number(b.grossQtyKg), 0);

      const wastePct = rawIn > 0 ? (wasteKg / rawIn) * 100 : 0;
      const yieldPct = rawIn > 0 ? (outKg / rawIn) * 100 : 0;
      const costPerKg = outKg > 0 ? cost / outKg : 0;

      const currentFgStock = st.finishedGoodsBatches.reduce((s, b) => s + Number(b.availableQty), 0);
      const currentRwStock = st.rawBatches.reduce((s, b) => s + Number(b.availableQty), 0);

      let benchmarkStatus: 'EXCELLENT' | 'NORMAL' | 'CRITICAL' = 'NORMAL';
      let benchmarkReason = 'معدلات مقبولة ضمن المستهدف';

      if (wastePct > 20.0 && rawIn > 0) {
        benchmarkStatus = 'CRITICAL';
        benchmarkReason = `نسبة الهالك (${wastePct.toFixed(1)}%) تتجاوز الحد المعياري (20%)`;
      } else if (yieldPct >= 82.0 && rawIn > 0) {
        benchmarkStatus = 'EXCELLENT';
        benchmarkReason = `كفاءة استخلاص متميزة (${yieldPct.toFixed(1)}%) وتكلفة منضبطة`;
      }

      return {
        stationId: st.id,
        stationName: st.name,
        location: st.location,
        rawReceivedKg: Math.round(rawRec),
        rawProcessedKg: Math.round(rawIn),
        finishedProducedKg: Math.round(outKg),
        wasteKg: Math.round(wasteKg),
        wasteRatePct: Math.round(wastePct * 10) / 10,
        yieldPct: Math.round(yieldPct * 10) / 10,
        costPerKg: Math.round(costPerKg * 100) / 100,
        operationsCount: ops.length,
        currentFinishedStockKg: Math.round(currentFgStock),
        currentRawStockKg: Math.round(currentRwStock),
        benchmarkStatus,
        benchmarkReason,
      };
    });

    // -------------------------------------------------------------
    // 8. EXECUTIVE SUMMARY AGGREGATION
    // -------------------------------------------------------------
    const prevProducedKg = prevOperations.reduce((s, o) => s + Number(o.finishedOutputKg), 0);
    const prevRevenueEgp = prevShipments.reduce((s, sh) => s + Number(sh.grossRevenueEgp), 0);
    const prevProfitEgp = prevShipments.reduce((s, sh) => s + Number(sh.netProfitEgp), 0);

    const prodKgChange = calculatePercentageChange(totalFinishedProducedKg, prevProducedKg);
    const revChange = calculatePercentageChange(totalRevenueEgp, prevRevenueEgp);
    const profitChange = calculatePercentageChange(totalProfitEgp, prevProfitEgp);

    const executive: ExecutiveReportData = {
      production: {
        rawReceivedKg: Math.round(totalRawReceivedKg),
        rawProcessedKg: Math.round(totalRawProcessedKg),
        finishedProducedKg: Math.round(totalFinishedProducedKg),
        operationsCount: currentOperations.length,
        avgYieldPct: Math.round(overallYieldPct * 10) / 10,
      },
      waste: {
        wasteKg: Math.round(wasteData.totalRawWasteKg),
        wasteCostEgp: Math.round(wasteData.grandTotalWasteLoss),
        wasteRatePct: wasteData.overallWastePct,
      },
      shipments: {
        count: currentShipments.length,
        shippedQtyKg: Math.round(totalShippedKg),
        revenueEgp: Math.round(totalRevenueEgp * 100) / 100,
        totalCostEgp: Math.round(totalShipmentCostEgp * 100) / 100,
        netProfitEgp: Math.round(totalProfitEgp * 100) / 100,
        avgMarginPct: Math.round(avgMarginPct * 10) / 10,
      },
      financials: {
        cashInflowEgp: Math.round(cashInflowEgp * 100) / 100,
        cashOutflowEgp: Math.round(cashOutflowEgp * 100) / 100,
        netCashMovementEgp: Math.round((cashInflowEgp - cashOutflowEgp) * 100) / 100,
        totalExpensesEgp: Math.round(totalExpensesEgp * 100) / 100,
        totalCollectionsEgp: Math.round(totalCollectionsEgp * 100) / 100,
        totalPaymentsEgp: Math.round(totalPaymentsEgp * 100) / 100,
        totalArOutstandingEgp: financial.receivables.remainingEgp,
        totalApOutstandingEgp: financial.payables.remainingEgp,
      },
      comparison: {
        productionKgChangePct: prodKgChange.pct,
        wasteKgChangePct: wasteData.comparison.qtyPctChange,
        revenueChangePct: revChange.pct,
        profitChangePct: profitChange.pct,
      },
    };

    // -------------------------------------------------------------
    // 9. MANAGEMENT DECISION INSIGHTS
    // -------------------------------------------------------------
    const insights: ManagementInsight[] = [];

    // Waste Insight
    if (wasteData.overallWastePct > 20.0) {
      insights.push({
        id: 'INS-WASTE-01',
        category: 'WASTE',
        title: 'تجاوز نسبة الهالك المعيارية على مستوى المجموعة',
        description: `بلغت نسبة فاقد الفرز ${wasteData.overallWastePct.toFixed(1)}% متجاوزة الحد المعياري (20%) بإجمالي تكلفة فاقد ${wasteData.grandTotalWasteLoss.toLocaleString()} ج.م.`,
        severity: 'ALERT',
        metricHighlight: `${wasteData.overallWastePct.toFixed(1)}% هالك فعلي`,
        actionRecommendation: 'مراجعة ضوابط الفحص الفني عند الاستلام (QC) والتأكد من التزام مقاولي الفرز بمعايير التشغيل.',
      });
    }

    // Critical Station Insight
    const problematicStation = stationBenchmarkList.find((st) => st.benchmarkStatus === 'CRITICAL');
    if (problematicStation) {
      insights.push({
        id: 'INS-STN-01',
        category: 'PRODUCTION',
        title: `ارتفاع فاقد التشغيل في ${problematicStation.stationName}`,
        description: `سجلت المحطة نسبة هالك ${problematicStation.wasteRatePct}% بإجمالي فاقد ${problematicStation.wasteKg.toLocaleString()} كجم بتكلفة تشغيل مرتفعة.`,
        severity: 'WARNING',
        metricHighlight: `${problematicStation.wasteRatePct}% هالك المحطة`,
        actionRecommendation: 'إرسال فريق رقابة جودة ميداني للمحطة لمراجعة ضبط خطوط الفرز والسيور.',
      });
    }

    // Supplier Concentration Insight
    if (sortedBySpend[0] && sortedBySpend[0].shareOfSpendPct >= 35) {
      insights.push({
        id: 'INS-SUPP-01',
        category: 'SUPPLIER',
        title: 'تركز مرتفع في مشتريات المواد الخام',
        description: `يمثل المورد (${sortedBySpend[0].supplierName}) ما نسبته ${sortedBySpend[0].shareOfSpendPct}% من إجمالي مدفوعات الخام خلال الفترة.`,
        severity: 'INFO',
        metricHighlight: `${sortedBySpend[0].shareOfSpendPct}% حصة المورد`,
        actionRecommendation: 'تنويع قاعدة المزارع والموردين لتفادي مخاطر تقلب الأسعار أو انقطاع التوريد.',
      });
    }

    // Receivables Insight
    if (financial.receivables.remainingEgp > 500000) {
      insights.push({
        id: 'INS-FIN-01',
        category: 'FINANCIAL',
        title: 'ارتفاع رصيد المستحقات القائمة على العملاء (AR)',
        description: `يوجد رصيد مستحق بقيمة ${financial.receivables.remainingEgp.toLocaleString()} ج.م على عملاء التصدير لم يتم تحصيله بعد.`,
        severity: 'WARNING',
        metricHighlight: `${financial.receivables.remainingEgp.toLocaleString()} ج.م متبقي`,
        actionRecommendation: 'متابعة بوالص الشحن وفترات الائتمان المقررة مع مسؤولي التصدير لتسريع وتيرة التحصيل.',
      });
    }

    // Production Growth Insight
    if (prodKgChange.pct > 15) {
      insights.push({
        id: 'INS-PROD-01',
        category: 'PRODUCTION',
        title: 'نمو ملحوظ في حجم الإنتاج المجهز للتصدير',
        description: `ارتفعت كمية المنتج التام المصنع بنسبة +${prodKgChange.pct}% مقارنة بالفترة السابقة بإجمالي ${totalFinishedProducedKg.toLocaleString()} كجم.`,
        severity: 'INFO',
        metricHighlight: `+${prodKgChange.pct}% إنتاج`,
        actionRecommendation: 'التنسيق مع فريق المبيعات لحجز الحاويات وبرامج الشحن لتفادي تكدس ثلاجات التخزين.',
      });
    }

    // 10. MONTHLY TRENDS AGGREGATION (For Yearly & Multi-month Reporting)
    const arabicMonthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const targetYear = current.startDate.getFullYear();
    const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
      const mIndex = i + 1;
      const mName = arabicMonthNames[i];

      const mRawBatches = currentRawBatches.filter((b) => {
        const d = new Date(b.receivedDate);
        return d.getMonth() === i && d.getFullYear() === targetYear;
      });

      const mOps = currentOperations.filter((op) => {
        const d = new Date(op.date);
        return d.getMonth() === i && d.getFullYear() === targetYear;
      });

      const mShipments = currentShipments.filter((sh) => {
        if (!sh.dispatchDate) return false;
        const d = new Date(sh.dispatchDate);
        return d.getMonth() === i && d.getFullYear() === targetYear;
      });

      const mTxns = financialTxns.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === i && d.getFullYear() === targetYear;
      });

      const rawRec = mRawBatches.reduce((s, b) => s + Number(b.grossQtyKg), 0);
      const rawProc = mOps.reduce((s, o) => s + Number(o.rawInputKg), 0);
      const fgOut = mOps.reduce((s, o) => s + Number(o.finishedOutputKg), 0);
      const waste = mOps.reduce((s, o) => s + Number(o.rawWasteKg), 0);
      const wasteRate = rawProc > 0 ? (waste / rawProc) * 100 : 0;

      const shippedKg = mShipments.reduce((s, sh) => s + Number(sh.shippedQtyKg), 0);
      const revEgp = mShipments.reduce((s, sh) => s + Number(sh.grossRevenueEgp), 0);
      const revEur = mShipments.reduce((s, sh) => s + (Number(sh.shippedQtyKg) * Number(sh.sellingPriceEur)), 0);

      let cashIn = 0;
      let cashOut = 0;
      let exp = 0;
      mTxns.forEach((t) => {
        const amt = Number(t.amountEgp);
        const isCol = t.type.includes('تحصيل') || t.type.includes('وارد') || t.type.includes('Inflow');
        const isPay = t.type.includes('سداد') || t.type.includes('منصرف') || t.type.includes('Outflow');
        const isExp = t.type.includes('مصروف') || t.partyType.includes('مصروف');
        if (isCol) cashIn += amt;
        if (isPay) cashOut += amt;
        if (isExp) exp += amt;
      });

      const hasAct = mRawBatches.length > 0 || mOps.length > 0 || mShipments.length > 0 || mTxns.length > 0;

      return {
        monthIndex: mIndex,
        monthName: mName,
        year: targetYear,
        rawReceivedKg: Math.round(rawRec),
        rawProcessedKg: Math.round(rawProc),
        finishedProducedKg: Math.round(fgOut),
        wasteKg: Math.round(waste),
        wasteRatePct: Math.round(wasteRate * 10) / 10,
        operationsCount: mOps.length,
        shippedQtyKg: Math.round(shippedKg),
        revenueEgp: Math.round(revEgp * 100) / 100,
        revenueEur: Math.round(revEur * 100) / 100,
        cashInflowEgp: Math.round(cashIn * 100) / 100,
        cashOutflowEgp: Math.round(cashOut * 100) / 100,
        netCashEgp: Math.round((cashIn - cashOut) * 100) / 100,
        totalExpensesEgp: Math.round(exp * 100) / 100,
        hasActivity: hasAct,
      };
    });

    return {
      activePeriod: {
        startDateStr: current.startDateStr,
        endDateStr: current.endDateStr,
        label: current.label,
        period,
        selectedStationId,
        selectedStationName: activeStationName,
      },
      executive,
      production,
      waste: wasteData,
      inventory,
      procurement,
      sales,
      financial,
      stations: stationBenchmarkList,
      insights,
      monthlyTrends,
    };
  } catch (error) {
    console.error('Failed to compute complete reporting hub data:', error);
    throw error;
  }
}
