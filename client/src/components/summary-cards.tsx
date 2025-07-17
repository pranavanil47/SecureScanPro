import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info, Layers } from "lucide-react";
import type { ScanSummary } from "@shared/schema";

interface SummaryCardsProps {
  summary: ScanSummary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: "Critical",
      value: summary.critical,
      color: "text-red-600",
      bgColor: "bg-red-100",
      icon: AlertTriangle,
    },
    {
      label: "High", 
      value: summary.high,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      icon: AlertCircle,
    },
    {
      label: "Medium",
      value: summary.medium,
      color: "text-yellow-600", 
      bgColor: "bg-yellow-100",
      icon: Info,
    },
    {
      label: "Dependencies",
      value: summary.dependencies,
      color: "text-blue-600",
      bgColor: "bg-blue-100", 
      icon: Layers,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral dark:text-gray-400">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <card.icon className={`${card.color} w-6 h-6`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
