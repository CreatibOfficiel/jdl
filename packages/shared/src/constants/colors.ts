export interface PawnColor {
  id: string;
  hex: string;
  label: string;
}

export const PAWN_COLORS: ReadonlyArray<PawnColor> = [
  { id: 'coral', hex: '#E63946', label: 'Rouge corail' },
  { id: 'navy', hex: '#1D3557', label: 'Bleu marine' },
  { id: 'pine', hex: '#06A77D', label: 'Vert sapin' },
  { id: 'amber', hex: '#F4A261', label: 'Orange chaud' },
  { id: 'violet', hex: '#7209B7', label: 'Violet profond' },
  { id: 'fuchsia', hex: '#FF006E', label: 'Rose néon' },
  { id: 'flame', hex: '#FB5607', label: 'Orange vif' },
  { id: 'cyan', hex: '#00B4D8', label: 'Cyan' },
  { id: 'coffee', hex: '#6F4E37', label: 'Marron café' },
  { id: 'graphite', hex: '#2B2D42', label: 'Anthracite' },
];

export const PAWN_COLOR_IDS = PAWN_COLORS.map((c) => c.id);
