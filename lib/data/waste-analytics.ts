import { prisma } from '@/lib/prisma';
import { resolvePeriodDates, calculatePercentageChange, ReportPeriod } from '@/lib/reports/date-utils';

export interface WasteFilterParams {
  period?: ReportPeriod | string | null;
  startDate?: string | null;
  endDate?: string | null;
  stationId?: string | null;
}

export interface StationWasteBenchmark {
  stationId: string;
  stationName: string;
  wasteKg: number;
  wasteCostEgp: number;
  rawInputKg: number;
  wasteRatePct: number;
  operationsCount: number;
  isProblematic: boolean;
}

export interface WasteTrendPoint {
  dateLabel: string;
  dateKey: string;
  wasteKg: number;
  wasteCostEgp: number;
}

export interface DetailedWasteOperation {
  id: string;
  date: string;
  stationName: string;
  stationId: string;
  rawProduct: string;
  finishedProduct: string;
  generatedBatchId: string | null;
  rawInputKg: number;
  rawWasteKg: number;
  wasteCostEgp: number;
  yieldPercent: number;
  notes: string | null;
}

export interface WasteAnalyticsResult {
  currentPeriod: {
    startDateStr: string;
    endDateStr: string;
    label: string;
    period: string;
  };
  previousPeriod: {
    startDateStr: string;
    endDateStr: string;
    label: string;
  };
  selectedStationId: string;
  // KPIs
  totalRawInputKg: number;
  totalRawWasteKg: number;
  totalRawWasteEgp: number;
  totalSuppliesWasteEgp: number;
  grandTotalWasteLoss: number;
  overallWastePct: number;
  standardWastePct: number;
  operationsCount: number;
  // Period Comparison
  comparison: {
    qtyDiff: number;
    qtyPctChange: number;
    qtyDirection: 'UP' | 'DOWN' | 'EQUAL';
    costDiff: number;
    costPctChange: number;
    costDirection: 'UP' | 'DOWN' | 'EQUAL';
    prevWasteKg: number;
    prevWasteCost: number;
    prevWastePct: number;
  };
  // Breakdowns
  stationBenchmarks: StationWasteBenchmark[];
  trend: WasteTrendPoint[];
  detailedOperations: DetailedWasteOperation[];
  suppliersList: Array<{ name: string; rawDelivered: number; attributedWaste: number; wastePct: number }>;
}

export async function getWasteAnalytics(params: WasteFilterParams = {}): Promise<WasteAnalyticsResult> {
  const { current, previous, period } = resolvePeriodDates({
    period: params.period,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  const selectedStationId = params.stationId && params.stationId !== 'all' ? params.stationId : 'all';

  const baseWhere: any = {
    status: { not: 'CANCELLED' },
  };

  if (selectedStationId !== 'all') {
    baseWhere.stationId = selectedStationId;
  }

  try {
    // 1. Fetch current period operations
    const currentOperations = await prisma.processingOperation.findMany({
      where: {
        ...baseWhere,
        date: {
          gte: current.startDate,
          lte: current.endDate,
        },
      },
      include: {
        station: true,
        rawIssues: true,
        supplyIssues: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // 2. Fetch previous period operations for true period comparison
    const previousOperations = await prisma.processingOperation.findMany({
      where: {
        ...baseWhere,
        date: {
          gte: previous.startDate,
          lte: previous.endDate,
        },
      },
      select: {
        rawWasteKg: true,
        rawInputKg: true,
        rawCost: true,
        suppliesWasteCost: true,
      },
    });

    // Compute Previous Period totals
    let prevWasteKg = 0;
    let prevWasteCost = 0;
    let prevRawInputKg = 0;
    for (const op of previousOperations) {
      const input = Number(op.rawInputKg);
      const waste = Number(op.rawWasteKg);
      const rawCost = Number(op.rawCost);
      const supCost = Number(op.suppliesWasteCost);
      const avgRawUnitCost = input > 0 ? rawCost / input : 0;
      prevWasteKg += waste;
      prevRawInputKg += input;
      prevWasteCost += (waste * avgRawUnitCost) + supCost;
    }
    const prevWastePct = prevRawInputKg > 0 ? (prevWasteKg / prevRawInputKg) * 100 : 0;

    // Compute Current Period totals & breakdowns
    let totalRawInputKg = 0;
    let totalRawWasteKg = 0;
    let totalRawWasteEgp = 0;
    let totalSuppliesWasteEgp = 0;

    const stationMap: Record<string, {
      stationId: string;
      stationName: string;
      wasteKg: number;
      wasteCostEgp: number;
      rawInputKg: number;
      operationsCount: number;
    }> = {};

    const trendMap: Record<string, { dateLabel: string; wasteKg: number; wasteCostEgp: number }> = {};
    const supplierMap: Record<string, { name: string; rawDelivered: number; attributedWaste: number }> = {};
    const detailedOperations: DetailedWasteOperation[] = [];

    for (const op of currentOperations) {
      const inputKg = Number(op.rawInputKg);
      const wasteKg = Number(op.rawWasteKg);
      const rawCost = Number(op.rawCost);
      const supWasteCost = Number(op.suppliesWasteCost);
      const avgCostPerKg = inputKg > 0 ? rawCost / inputKg : 0;
      const opWasteCost = Math.round(((wasteKg * avgCostPerKg) + supWasteCost) * 100) / 100;

      totalRawInputKg += inputKg;
      totalRawWasteKg += wasteKg;
      totalRawWasteEgp += (wasteKg * avgCostPerKg);
      totalSuppliesWasteEgp += supWasteCost;

      // Station grouping
      const stId = op.stationId;
      const stName = op.station?.name || stId;
      if (!stationMap[stId]) {
        stationMap[stId] = {
          stationId: stId,
          stationName: stName,
          wasteKg: 0,
          wasteCostEgp: 0,
          rawInputKg: 0,
          operationsCount: 0,
        };
      }
      stationMap[stId].wasteKg += wasteKg;
      stationMap[stId].wasteCostEgp += opWasteCost;
      stationMap[stId].rawInputKg += inputKg;
      stationMap[stId].operationsCount += 1;

      // Trend grouping based on period
      const opDate = new Date(op.date);
      let dateKey: string;
      let dateLabel: string;

      if (period === 'yearly') {
        const monthNum = opDate.getMonth() + 1;
        const monthNames = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        dateKey = `${opDate.getFullYear()}-${String(monthNum).padStart(2, '0')}`;
        dateLabel = monthNames[opDate.getMonth()];
      } else {
        const day = String(opDate.getDate()).padStart(2, '0');
        const month = String(opDate.getMonth() + 1).padStart(2, '0');
        dateKey = `${opDate.getFullYear()}-${month}-${day}`;
        dateLabel = `${day}/${month}`;
      }

      if (!trendMap[dateKey]) {
        trendMap[dateKey] = { dateLabel, wasteKg: 0, wasteCostEgp: 0 };
      }
      trendMap[dateKey].wasteKg += wasteKg;
      trendMap[dateKey].wasteCostEgp += opWasteCost;

      // Supplier attribution via rawIssues
      if (op.rawIssues && op.rawIssues.length > 0 && inputKg > 0) {
        for (const issue of op.rawIssues) {
          const supName = issue.supplierName || 'مورد عام';
          const issueQty = Number(issue.qtyKg);
          const shareOfWaste = wasteKg * (issueQty / inputKg);

          if (!supplierMap[supName]) {
            supplierMap[supName] = { name: supName, rawDelivered: 0, attributedWaste: 0 };
          }
          supplierMap[supName].rawDelivered += issueQty;
          supplierMap[supName].attributedWaste += shareOfWaste;
        }
      }

      // Detailed operations log
      detailedOperations.push({
        id: op.id,
        date: op.date.toISOString().substring(0, 10),
        stationName: stName,
        stationId: stId,
        rawProduct: op.rawProduct,
        finishedProduct: op.finishedProduct,
        generatedBatchId: op.generatedBatchId,
        rawInputKg: inputKg,
        rawWasteKg: wasteKg,
        wasteCostEgp: opWasteCost,
        yieldPercent: Number(op.yieldPercent),
        notes: op.notes,
      });
    }

    const grandTotalWasteLoss = Math.round((totalRawWasteEgp + totalSuppliesWasteEgp) * 100) / 100;
    const overallWastePct = totalRawInputKg > 0 ? (totalRawWasteKg / totalRawInputKg) * 100 : 0;
    const standardWastePct = 20.0;

    // Build Station Benchmarks
    const stationBenchmarks: StationWasteBenchmark[] = Object.values(stationMap).map((st) => {
      const wasteRatePct = st.rawInputKg > 0 ? (st.wasteKg / st.rawInputKg) * 100 : 0;
      return {
        ...st,
        wasteRatePct: Math.round(wasteRatePct * 10) / 10,
        wasteCostEgp: Math.round(st.wasteCostEgp * 100) / 100,
        isProblematic: wasteRatePct > standardWastePct,
      };
    });

    // Build Trend Points (sorted by chronological date key)
    const trend: WasteTrendPoint[] = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, val]) => ({
        dateKey,
        dateLabel: val.dateLabel,
        wasteKg: Math.round(val.wasteKg),
        wasteCostEgp: Math.round(val.wasteCostEgp),
      }));

    // Build Comparison
    const qtyChange = calculatePercentageChange(totalRawWasteKg, prevWasteKg);
    const costChange = calculatePercentageChange(grandTotalWasteLoss, prevWasteCost);

    // Build Suppliers List
    const suppliersList = Object.values(supplierMap).map((sup) => ({
      ...sup,
      wastePct: sup.rawDelivered > 0 ? Math.round((sup.attributedWaste / sup.rawDelivered) * 1000) / 10 : 0,
    }));

    return {
      currentPeriod: {
        startDateStr: current.startDateStr,
        endDateStr: current.endDateStr,
        label: current.label,
        period,
      },
      previousPeriod: {
        startDateStr: previous.startDateStr,
        endDateStr: previous.endDateStr,
        label: previous.label,
      },
      selectedStationId,
      totalRawInputKg: Math.round(totalRawInputKg),
      totalRawWasteKg: Math.round(totalRawWasteKg),
      totalRawWasteEgp: Math.round(totalRawWasteEgp * 100) / 100,
      totalSuppliesWasteEgp: Math.round(totalSuppliesWasteEgp * 100) / 100,
      grandTotalWasteLoss,
      overallWastePct: Math.round(overallWastePct * 10) / 10,
      standardWastePct,
      operationsCount: currentOperations.length,
      comparison: {
        qtyDiff: Math.round(qtyChange.diff),
        qtyPctChange: qtyChange.pct,
        qtyDirection: qtyChange.direction,
        costDiff: Math.round(costChange.diff * 100) / 100,
        costPctChange: costChange.pct,
        costDirection: costChange.direction,
        prevWasteKg: Math.round(prevWasteKg),
        prevWasteCost: Math.round(prevWasteCost * 100) / 100,
        prevWastePct: Math.round(prevWastePct * 10) / 10,
      },
      stationBenchmarks,
      trend,
      detailedOperations,
      suppliersList,
    };
  } catch (error) {
    console.error('Failed to calculate waste analytics:', error);
    return {
      currentPeriod: {
        startDateStr: current.startDateStr,
        endDateStr: current.endDateStr,
        label: current.label,
        period,
      },
      previousPeriod: {
        startDateStr: previous.startDateStr,
        endDateStr: previous.endDateStr,
        label: previous.label,
      },
      selectedStationId,
      totalRawInputKg: 0,
      totalRawWasteKg: 0,
      totalRawWasteEgp: 0,
      totalSuppliesWasteEgp: 0,
      grandTotalWasteLoss: 0,
      overallWastePct: 0,
      standardWastePct: 20.0,
      operationsCount: 0,
      comparison: {
        qtyDiff: 0,
        qtyPctChange: 0,
        qtyDirection: 'EQUAL',
        costDiff: 0,
        costPctChange: 0,
        costDirection: 'EQUAL',
        prevWasteKg: 0,
        prevWasteCost: 0,
        prevWastePct: 0,
      },
      stationBenchmarks: [],
      trend: [],
      detailedOperations: [],
      suppliersList: [],
    };
  }
}
