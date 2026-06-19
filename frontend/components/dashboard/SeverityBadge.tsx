import { cn, getSeverityColor } from "@/lib/utils";

interface SeverityBadgeProps {
  severity: string;
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
      getSeverityColor(severity)
    )}>
      {severity}
    </span>
  );
}
