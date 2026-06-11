import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-[1.5rem] border border-border bg-card", className)}
    {...props}
  />
));
Card.displayName = "Card";

export { Card };
