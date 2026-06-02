export const ELEMENT_COLORS: Record<string, string> = {
  Neutral: '#b8b8b8',
  Light: '#ffe08a',
  Ground: '#caa472',
  Dark: '#7c6f9c',
  Electric: '#7fd3f0',
  Grass: '#9ddc8a',
  Fire: '#ff9b7a',
  Water: '#8ab6ff',
  Null: '#d6d6d6',
};

export function elementColor(el: string): string {
  return ELEMENT_COLORS[el] ?? '#cccccc';
}
