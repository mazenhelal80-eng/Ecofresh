export interface FinishedGoodsGroupBatch {
  fgBatchId: string;
  sourceType: string;
  sourceOpId?: string | null;
  dealRef?: string | null;
  stationId: string;
  locationId?: string | null;
  productName: string;
  productionDate: Date | string;
  expiryDate?: Date | string | null;
  initialQty: number;
  availableQty: number;
  costPerKg: number;
  totalValue: number;
  qualityStatus?: string;
  rawSources?: any;
  suppliersSummary?: any;
  createdAt?: Date | string;
  station: {
    id: string;
    name: string;
    location?: string;
  };
  location?: {
    id: string;
    name: string;
  } | null;
}

export interface FinishedGoodsGroup {
  groupId: string;
  productName: string;
  stationId: string;
  station: {
    id: string;
    name: string;
    location?: string;
  };
  totalAvailableQty: number;
  totalInitialQty: number;
  totalValue: number;
  weightedAverageCost: number;
  batchesCount: number;
  sourceTypes: string[];
  earliestProdDate: string | null;
  latestProdDate: string | null;
  batches: FinishedGoodsGroupBatch[];
}

export function groupFinishedGoodsBatches(rawBatches: any[]): FinishedGoodsGroup[] {
  const groupsMap = new Map<string, FinishedGoodsGroup>();

  for (const raw of rawBatches) {
    const key = `${raw.productName}:::${raw.stationId}`;
    const availableQty = Number(raw.availableQty || 0);
    const initialQty = Number(raw.initialQty || 0);
    const costPerKg = Number(raw.costPerKg || 0);
    const batchTotalVal = Number(
      raw.totalValue != null ? raw.totalValue : availableQty * costPerKg
    );

    const batchObj: FinishedGoodsGroupBatch = {
      ...raw,
      initialQty,
      availableQty,
      costPerKg,
      totalValue: batchTotalVal,
    };

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        groupId: key,
        productName: raw.productName,
        stationId: raw.stationId,
        station: raw.station || { id: raw.stationId, name: raw.stationId },
        totalAvailableQty: availableQty,
        totalInitialQty: initialQty,
        totalValue: batchTotalVal,
        weightedAverageCost: costPerKg,
        batchesCount: 1,
        sourceTypes: raw.sourceType ? [raw.sourceType] : [],
        earliestProdDate: raw.productionDate
          ? new Date(raw.productionDate).toISOString().split("T")[0]
          : null,
        latestProdDate: raw.productionDate
          ? new Date(raw.productionDate).toISOString().split("T")[0]
          : null,
        batches: [batchObj],
      });
    } else {
      const group = groupsMap.get(key)!;
      group.totalAvailableQty += availableQty;
      group.totalInitialQty += initialQty;
      group.totalValue += batchTotalVal;
      group.batchesCount += 1;
      if (raw.sourceType && !group.sourceTypes.includes(raw.sourceType)) {
        group.sourceTypes.push(raw.sourceType);
      }
      if (raw.productionDate) {
        const prodDateStr = new Date(raw.productionDate).toISOString().split("T")[0];
        if (!group.earliestProdDate || prodDateStr < group.earliestProdDate) {
          group.earliestProdDate = prodDateStr;
        }
        if (!group.latestProdDate || prodDateStr > group.latestProdDate) {
          group.latestProdDate = prodDateStr;
        }
      }
      group.batches.push(batchObj);
    }
  }

  // Calculate final weighted average cost for each group
  const result = Array.from(groupsMap.values()).map((group) => {
    const weightedAverageCost =
      group.totalAvailableQty > 0 ? group.totalValue / group.totalAvailableQty : 0;

    // Sort batches inside each group by production date desc
    group.batches.sort((a, b) => {
      const dateA = a.productionDate ? new Date(a.productionDate).getTime() : 0;
      const dateB = b.productionDate ? new Date(b.productionDate).getTime() : 0;
      return dateB - dateA;
    });

    return {
      ...group,
      weightedAverageCost,
    };
  });

  // Sort groups by total available quantity descending
  result.sort((a, b) => b.totalAvailableQty - a.totalAvailableQty);

  return result;
}
