import { cn, getTierColor } from "@/lib/utils";

interface TierBadgeProps {
  tier: string | null | undefined;
  size?: "sm" | "md";
}

export default function TierBadge({ tier, size = "md" }: TierBadgeProps) {
  if (!tier) return <span className="text-gray-400 text-xs">—</span>;

  return (
    <span className={cn(
      "inline-flex items-center font-semibold rounded-full",
      getTierColor(tier),
      size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
    )}>
      {tier}
    </span>
  );
}
