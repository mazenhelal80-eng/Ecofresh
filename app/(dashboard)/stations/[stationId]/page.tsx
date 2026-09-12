import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { Building2, AlertTriangle, ArrowRight } from 'lucide-react';
import { getStationControlCenterData } from '@/actions/stations';
import { StationControlCenter } from '@/components/modules/stations/details/station-control-center';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface StationPageProps {
  params: {
    stationId: string;
  };
}

export async function generateMetadata({ params }: StationPageProps): Promise<Metadata> {
  const result = await getStationControlCenterData(params.stationId);
  if (!result.success || !result.data?.station) {
    return {
      title: 'مركز التحكم بالمحطة | EcoFresh',
    };
  }
  return {
    title: `${result.data.station.name} | مركز التحكم والمخزون | EcoFresh`,
  };
}

export default async function StationDetailsPage({ params }: StationPageProps) {
  const result = await getStationControlCenterData(params.stationId);

  if (!result.success || !result.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4" dir="rtl">
        <div className="p-4 bg-amber-50 dark:bg-amber-950/50 rounded-2xl text-amber-600 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {result.error || 'المحطة المطلوبة غير موجودة'}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          لم يتم العثور على سجلات المحطة المحددة أو قد تكون أزيلت من النظام.
        </p>
        <Button asChild className="gap-2">
          <Link href="/stations">
            <ArrowRight className="h-4 w-4" />
            <span>العودة لقائمة المحطات</span>
          </Link>
        </Button>
      </div>
    );
  }

  return <StationControlCenter data={result.data} />;
}
