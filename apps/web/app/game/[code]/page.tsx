import { GameClient } from './GameClient';

interface GamePageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{
    name?: string;
    suit?: string;
    color?: string;
    emoji?: string;
  }>;
}

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { code } = await params;
  const profile = await searchParams;
  return <GameClient code={code} initialProfile={profile} />;
}
