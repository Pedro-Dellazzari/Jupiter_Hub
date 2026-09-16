import { motion } from "motion/react";
import { springs } from "../motion/springs";
import { cn } from "../utils/cn";

type ProgressBarProps = {
  /** 0–100 */
  value: number;
  color?: string;
  className?: string;
};

export function ProgressBar({ value, color = "var(--color-accent)", className }: ProgressBarProps) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-(--color-track)", className)}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={springs.gentle}
      />
    </div>
  );
}
