import { MasterClient } from './MasterClient';

interface MasterPageProps {
  params: Promise<{ code: string }>;
}

export default async function MasterPage({ params }: MasterPageProps) {
  const { code } = await params;
  return <MasterClient code={code} />;
}
