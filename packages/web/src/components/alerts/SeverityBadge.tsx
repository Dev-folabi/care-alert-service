import { Badge } from "@/components/ui/Badge";
import type { Severity } from "@/types/alert";

interface SeverityBadgeProps {
  severity: Severity;
}

const labels: Record<Severity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <Badge variant={severity.toLowerCase() as "low" | "medium" | "high"}>
      {labels[severity]}
    </Badge>
  );
}
