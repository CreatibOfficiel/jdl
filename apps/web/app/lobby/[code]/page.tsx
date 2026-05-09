import { LobbyClient } from './LobbyClient';

interface LobbyPageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{
    name?: string;
    suit?: string;
    color?: string;
    emoji?: string;
    equivalencePreference?: string;
    difficulty?: string;
  }>;
}

export default async function LobbyPage({ params, searchParams }: LobbyPageProps) {
  const { code } = await params;
  const profile = await searchParams;
  return <LobbyClient code={code} initialProfile={profile} />;
}
