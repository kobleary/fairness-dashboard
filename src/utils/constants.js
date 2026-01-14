export function valueSemantic(measure) {
  if (measure && measure.toLowerCase().includes('representativeness')) {
    return {
      kind: 'level',
      label: 'Level'
    };
  }
  return {
    kind: 'difference',
    label: 'Difference vs White (reference)'
  };
}

export const STANDARD_CAPTION =
  'Values are differences relative to White (reference) where applicable; Representativeness is shown as levels.';
