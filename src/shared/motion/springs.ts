import type { Transition } from "motion/react";

/**
 * Presets de spring reutilizados por todo o app, para manter a física
 * do movimento consistente entre módulos (em vez de easing fixo).
 */
export const springs = {
  standard: { type: "spring", damping: 26, stiffness: 260 } satisfies Transition,
  gentle: { type: "spring", damping: 30, stiffness: 160 } satisfies Transition,
  snappy: { type: "spring", damping: 22, stiffness: 380 } satisfies Transition,
} as const;
