import type { ComponentPropsWithoutRef } from "react";

type LogoMarkProps = Omit<ComponentPropsWithoutRef<"svg">, "width" | "height"> & {
  size?: number;
};

/**
 * Ícone do Jupiter Hub: módulos em grade e o planeta ocupando a quarta célula.
 * As cores vêm dos tokens `--logo-*` (index.css), que trocam junto com o tema.
 * Fonte da verdade dos arquivos exportáveis: `branding/`.
 */
export function LogoMark({ size = 32, ...props }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      role="img"
      aria-label="Jupiter Hub"
      {...props}
    >
      <rect width="240" height="240" rx="54" fill="var(--logo-tile)" />
      <rect
        x="1"
        y="1"
        width="238"
        height="238"
        rx="53"
        fill="none"
        stroke="var(--logo-outline)"
        strokeWidth="2"
      />
      <rect x="30" y="30" width="84" height="84" rx="24" fill="var(--logo-module-a)" />
      <rect x="126" y="30" width="84" height="84" rx="24" fill="var(--logo-module-b)" />
      <rect x="30" y="126" width="84" height="84" rx="24" fill="var(--logo-module-b)" />
      <circle cx="168" cy="168" r="46" fill="var(--color-brand)" />
    </svg>
  );
}
