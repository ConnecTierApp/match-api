import * as React from "react";

import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "success" | "warning";

const variantClasses: Record<Variant, string> = {
  default: "bg-primary/10 text-primary border border-primary/20",
  secondary: "bg-muted text-muted-foreground",
  outline: "border border-border",
  success: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

const Badge = ({ className, variant = "default", ...props }: BadgeProps) => {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium uppercase",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
};

export { Badge };
