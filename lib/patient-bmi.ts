/** BMI from mass (kg) and height (m): kg / m² */
export function computeBmiKgM2(weightKg: number, heightM: number): number {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightM) || heightM <= 0) {
    return NaN;
  }
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}
