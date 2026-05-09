import { notFound } from 'next/navigation';
import { ReplayClient } from './ReplayClient';
import { fetchGameDetail, fetchGameSipEvents } from '@/lib/statsApi';

export const dynamic = 'force-dynamic';

interface ReplayPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReplayPage({ params }: ReplayPageProps) {
  const { id } = await params;
  const [detail, events] = await Promise.all([fetchGameDetail(id), fetchGameSipEvents(id)]);
  if (!detail) notFound();
  return <ReplayClient detail={detail} events={events} />;
}
