import { RulesClient } from './RulesClient';

export const metadata = {
  title: "Règles du jeu — Jeu de l'Oie Soirée",
  description:
    'Comment jouer, les 19 cases, les variantes de difficulté et les équivalences sport.',
};

export default function RulesPage() {
  return <RulesClient />;
}
