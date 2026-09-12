export interface RawMaterialGroupBatch {
  batchId: string;
  stationId: string;
  locationId?: string | null;
  rawProduct: string;
  supplierId: string;
  grossQtyKg: number;
  tareQtyKg: number;
  initialQty: number;
  availableQty: number;
  unitPriceEgp: number;
  transportCostEgp: number;
  unitCost: number;
  totalPayableEgp: number;
  receivedDate: Date | string;
  qcStatus: string;
  brixDegree?: number | null;
  truckPlate?: string | null;
  driverName?: string | null;
  notes?: string | null;
  createdAt?: Date | string;
  station: {
    id: string;
    name: string;
    location?: string;
  };
  supplier: {
    id: string;
    name: string;
    phone?: string | null;
  };
}

export interface RawMaterialGroup {
  groupId: string;
  rawProduct: string;
  stationId: string;
  station: {
    id: string;
    name: string;
    location?: string;
  };
  totalInitialQty: number;
  totalAvailableQty: number;
  totalConsumedQty: number;
  totalValue: number;
  weightedAverageCost: number;
  batchesCount: number;
  suppliersList: Array<{ id: string; name: string; phone?: string | null }>;
  qcStatuses: string[];
  earliestReceivedDate: string | null;
  latestReceivedDate: string | null;
  averageBrix: number | null;
  batches: RawMaterialGroupBatch[];
}

export function groupRawBatches(rawLots: any[]): RawMaterialGroup[] {
  const groupsMap = new Map<string, RawMaterialGroup>();

  for (const raw of rawLots) {
    const key = `${raw.rawProduct}:::${raw.stationId}`;
    const initialQty = Number(raw.initialQty || 0);
    const availableQty = Number(raw.availableQty || 0);
    const consumedQty = Math.max(0, initialQty - availableQty);
    const unitCost = Number(raw.unitCost || 0);
    const batchTotalVal = availableQty * unitCost;
    const brix = raw.brixDegree != null ? Number(raw.brixDegree) : null;

    const batchObj: RawMaterialGroupBatch = {
      ...raw,
      grossQtyKg: Number(raw.grossQtyKg || 0),
      tareQtyKg: Number(raw.tareQtyKg || 0),
      initialQty,
      availableQty,
      unitPriceEgp: Number(raw.unitPriceEgp || 0),
      transportCostEgp: Number(raw.transportCostEgp || 0),
      unitCost,
      totalPayableEgp: Number(raw.totalPayableEgp || 0),
      brixDegree: brix,
    };

    const supplierObj = raw.supplier
      ? { id: raw.supplier.id, name: raw.supplier.name, phone: raw.supplier.phone }
      : { id: raw.supplierId, name: raw.supplierId, phone: null };

    if (!groupsMap.has(key)) {
      const recDateStr = raw.receivedDate
        ? new Date(raw.receivedDate).toISOString().split("T")[0]
        : null;

      groupsMap.set(key, {
        groupId: key,
        rawProduct: raw.rawProduct,
        stationId: raw.stationId,
        station: raw.station || { id: raw.stationId, name: raw.stationId },
        totalInitialQty: initialQty,
        totalAvailableQty: availableQty,
        totalConsumedQty: consumedQty,
        totalValue: batchTotalVal,
        weightedAverageCost: unitCost,
        batchesCount: 1,
        suppliersList: [supplierObj],
        qcStatuses: raw.qcStatus ? [raw.qcStatus] : [],
        earliestReceivedDate: recDateStr,
        latestReceivedDate: recDateStr,
        averageBrix: brix,
        batches: [batchObj],
      });
    } else {
      const group = groupsMap.get(key)!;
      group.totalInitialQty += initialQty;
      group.totalAvailableQty += availableQty;
      group.totalConsumedQty += consumedQty;
      group.totalValue += batchTotalVal;
      group.batchesCount += 1;

      // Add supplier if not already present
      if (!group.suppliersList.some((s) => s.id === supplierObj.id)) {
        group.suppliersList.push(supplierObj);
      }

      // Add QC status if not present
      if (raw.qcStatus && !group.qcStatuses.includes(raw.qcStatus)) {
        group.qcStatuses.push(raw.qcStatus);
      }

      // Track received dates
      if (raw.receivedDate) {
        const recDateStr = new Date(raw.receivedDate).toISOString().split("T")[0];
        if (!group.earliestReceivedDate || recDateStr < group.earliestReceivedDate) {
          group.earliestReceivedDate = recDateStr;
        }
        if (!group.latestReceivedDate || recDateStr > group.latestReceivedDate) {
          group.latestReceivedDate = recDateStr;
        }
      }

      group.batches.push(batchObj);
    }
  }

  // Calculate final weighted average cost & average brix for each group
  const result = Array.from(groupsMap.values()).map((group) => {
    const weightedAverageCost =
      group.totalAvailableQty > 0 ? group.totalValue / group.totalAvailableQty : 0;

    const brixBatches = group.batches.filter((b) => b.brixDegree != null);
    const averageBrix =
      brixBatches.length > 0
        ? brixBatches.reduce((sum, b) => sum + (b.brixDegree || 0), 0) /
          brixBatches.length
        : null;

    // Sort batches inside each group by receivedDate desc
    group.batches.sort((a, b) => {
      const dateA = a.receivedDate ? new Date(a.receivedDate).getTime() : 0;
      const dateB = b.receivedDate ? new Date(b.receivedDate).getTime() : 0;
      return dateB - dateA;
    });

    return {
      ...group,
      weightedAverageCost,
      averageBrix,
    };
  });

  // Sort groups by total available quantity descending
  result.sort((a, b) => b.totalAvailableQty - a.totalAvailableQty);

  return result;
}
