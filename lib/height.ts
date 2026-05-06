export function cmToFeetInches(cm?: number | null) {
  if (!cm || Number.isNaN(cm)) {
    return { feet: "", inches: "" };
  }

  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  return {
    feet: feet.toString(),
    inches: inches.toString(),
  };
}

export function feetInchesToCm(feetValue: string, inchesValue: string) {
  const feet = parseNumber(feetValue);
  const inches = parseNumber(inchesValue);

  if (feet === null && inches === null) {
    return null;
  }

  const totalInches = (feet || 0) * 12 + (inches || 0);
  if (totalInches <= 0) {
    return null;
  }

  return Math.round(totalInches * 2.54 * 10) / 10;
}

export function parseNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatHeight(cm?: number | null) {
  if (!cm) {
    return "Not set";
  }

  const { feet, inches } = cmToFeetInches(cm);
  if (!feet) {
    return `${cm} cm`;
  }

  return `${feet} ft ${inches || "0"} in (${cm} cm)`;
}
