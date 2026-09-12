import { prisma } from "@/lib/prisma";
import {
  RawMaterialGroup,
  RawMaterialGroupBatch,
  groupRawBatches,
} from "@/types/raw-inventory";

export type { RawMaterialGroup, RawMaterialGroupBatch };
export { groupRawBatches };

export async function getAvailableRawInventoryGroupsPaginated(
  page: number = 1,
  pageSize: number = 25
) {
  try {
    const rawLots = await prisma.rawBatch.findMany({
      where: { availableQty: { gt: 0 } },
      include: {
        station: true,
        supplier: true,
      },
      orderBy: { receivedDate: "desc" },
    });

    const parsedRaw = JSON.parse(JSON.stringify(rawLots));
    const allGroups = groupRawBatches(parsedRaw);
    const totalCount = allGroups.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const skip = (page - 1) * pageSize;
    const paginatedGroups = allGroups.slice(skip, skip + pageSize);

    return {
      groups: paginatedGroups,
      totalCount,
      totalPages,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("Failed to fetch paginated raw inventory groups:", error);
    return {
      groups: [],
      totalCount: 0,
      totalPages: 0,
      page,
      pageSize,
    };
  }
}

export async function getAvailableRawInventory() {
  try {
    return await prisma.rawBatch.findMany({
      where: { availableQty: { gt: 0 } },
      include: {
        station: true,
        supplier: true,
      },
      orderBy: { receivedDate: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch available raw inventory:", error);
    return [];
  }
}

export async function getRawBatchById(batchId: string) {
  try {
    return await prisma.rawBatch.findUnique({
      where: { batchId },
      include: {
        station: true,
        supplier: true,
        createdBy: true,
      },
    });
  } catch (error) {
    console.error(`Failed to fetch raw batch ${batchId}:`, error);
    return null;
  }
}
