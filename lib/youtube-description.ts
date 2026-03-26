export function buildYouTubeDescription(params: {
  athleteName: string
  disciplineLabel: string
  weightKg: number
  serial: string
  date?: string
}): string {
  const today = params.date ?? new Date().toISOString().split('T')[0]
  return `Athlete: ${params.athleteName}
Discipline: ${params.disciplineLabel}
Kettlebell Weight: ${params.weightKg} kg
Date: ${today}
Serial: ${params.serial}
Competition: TBD

Recorded with KOVA — Kettlebell Sport Competition Platform`
}
