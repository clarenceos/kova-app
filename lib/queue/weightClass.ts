const FEMALE_BRACKETS: [number, string][] = [
  [52, '52kg'],
  [57, '57kg'],
  [61, '61kg'],
  [66, '66kg'],
  [70, '70kg'],
  [74, '74kg'],
  [80, '80kg'],
];

const MALE_BRACKETS: [number, string][] = [
  [61, '61kg'],
  [66, '66kg'],
  [70, '70kg'],
  [74, '74kg'],
  [80, '80kg'],
  [89, '89kg'],
  [95, '95kg'],
];

export function getWeightClass(gender: 'Male' | 'Female', bodyWeightKg: number): string {
  const brackets = gender === 'Female' ? FEMALE_BRACKETS : MALE_BRACKETS;
  for (const [limit, label] of brackets) {
    if (bodyWeightKg <= limit) return label;
  }
  // Above all brackets — super heavyweight
  const lastLimit = brackets[brackets.length - 1][0];
  return `${lastLimit}+kg`;
}
