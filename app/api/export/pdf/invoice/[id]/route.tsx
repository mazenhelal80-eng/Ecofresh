import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { CommercialInvoiceDoc } from '@/components/pdf/commercial-invoice-doc';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const shipment = await prisma.shipment.findUnique({
    where: { shipmentId: params.id },
    include: {
      customer: true,
      order: true,
      allocatedBatches: {
        include: {
          batch: true,
        },
      },
    },
  });

  if (!shipment) {
    return NextResponse.json({ error: 'الشحنة غير موجودة' }, { status: 404 });
  }

  // إنشاء تيار الـ PDF المباشر
  const stream = await renderToStream(
    <CommercialInvoiceDoc shipment={shipment} />
  );

  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Invoice-${shipment.shipmentId}.pdf"`,
    },
  });
}
