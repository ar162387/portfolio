export const nicheDemos = {
  "garage-doors": { title: "Garage door receptionist", business: "Johnny Garage Doors", suggestion: "Try: My roller door is stuck halfway. Can someone come today?" },
  salons: { title: "Salon receptionist", business: "Willow Salon", suggestion: "Ask for a cut and blow-dry, or a first colour consultation." },
  "heating-plumbing": { title: "Heating and plumbing receptionist", business: "Oak Heating and Plumbing", suggestion: "Try: The radiators work, but I've got no hot water." },
} as const;
export type NicheKey = keyof typeof nicheDemos;
export function isNicheKey(value: unknown): value is NicheKey {
  return typeof value === "string" && Object.hasOwn(nicheDemos, value);
}
