"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";

export interface PieChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface PieChartProps {
  data: PieChartDataPoint[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  formatValue?: (value: number) => string;
  donut?: boolean;
}

const DEFAULT_COLORS = [
  "#3b82f6", // blue-500
  "#22c55e", // green-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Payload<number, string>[];
  formatValue?: (value: number) => string;
}

function CustomTooltip({ active, payload, formatValue }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const entry = payload[0];
  const total = (entry.payload as { total?: number })?.total;
  const percentage = total
    ? ((entry.value as number) / total * 100).toFixed(1)
    : null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: (entry.payload as { fill?: string })?.fill }}
        />
        <span className="font-medium">{entry.name}</span>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        {formatValue ? formatValue(entry.value as number) : entry.value}
        {percentage && ` (${percentage}%)`}
      </div>
    </div>
  );
}

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

const RADIAN = Math.PI / 180;

function renderCustomizedLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: LabelProps) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function PieChart({
  data,
  height = 300,
  innerRadius = 0,
  outerRadius = 80,
  showLegend = true,
  showLabels = true,
  formatValue,
  donut = false,
}: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const dataWithTotal = data.map((d) => ({ ...d, total }));

  const effectiveInnerRadius = donut ? outerRadius * 0.6 : innerRadius;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <Pie
          data={dataWithTotal}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={showLabels ? (props) => renderCustomizedLabel(props as LabelProps) : undefined}
          innerRadius={effectiveInnerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              strokeWidth={0}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-sm text-foreground">{value}</span>
            )}
          />
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
