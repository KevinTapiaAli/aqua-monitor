// Display transformations only: original measurements and quality remain intact.
export type AdcMaximum = 4095 | 65535;

export function adcPercent(value: number | null | undefined, maximum: AdcMaximum): number | null {
  if (value == null || !Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > maximum) return null;
  return value / maximum * 100;
}

// The supplied wiring guide reports lower ADC under illumination.
export function lightState(value: number | null | undefined, maximum: AdcMaximum, thresholdPercent: number): 0 | 1 | null {
  const percent = adcPercent(value, maximum);
  if (percent === null || !Number.isFinite(thresholdPercent) || thresholdPercent <= 0 || thresholdPercent >= 100) return null;
  return percent < thresholdPercent ? 1 : 0;
}

export function gasBand(percent: number | null): string {
  if (percent === null) return "Sin lectura compatible";
  return percent < 100 / 3 ? "Tercio inferior de escala" : percent < 200 / 3 ? "Tercio medio de escala" : "Tercio superior de escala";
}
