import { LobbyClient } from './LobbyClient';

interface LobbyPageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{
    name?: string;
    pin?: string;
  }>;
}

export default async function LobbyPage({ params, searchParams }: LobbyPageProps) {
  const { code } = await params;
  const { name, pin } = await searchParams;
  return <LobbyClient code={code} name={name ?? ''} pin={pin} />;
}
