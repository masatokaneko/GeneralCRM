"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";

export interface BarChartDataPoint {
  name: string;
  [key: string]: string | number;
}

export interface BarChartSeries {
  dataKey: string;
  name: string;
  color?: string;
  stackId?: string;
}

export interface BarChartProps {
  data: BarChartDataPoint[];
  series: BarChartSeries[];
  height?: number;
  xAxisKey?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  layout?: "horizontal" | "vertical";
  formatValue?: (value: number) => string;
  formatTooltip?: (value: number, name: string) => string;
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
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Payload<number, string>[];
  label?: string;
  formatValue?: (value: number) => string;
}

function CustomTooltip({ active, payload, label, formatValue }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-2 font-medium">{label}</p>
      {payload.map((entry: Payload<number, string>, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {formatValue ? formatValue(entry.value as number) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BarChart({
  data,
  series,
  height = 300,
  xAxisKey = "name",
  showGrid = true,
  showLegend = true,
  stacked = false,
  layout = "horizontal",
  formatValue,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        {layout === "horizontal" ? (
          <>
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
              className="text-muted-foreground"
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
              className="text-muted-foreground"
            />
            <YAxis
              type="category"
              dataKey={xAxisKey}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
          </>
        )}
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        {showLegend && <Legend />}
        {series.map((s, index) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.name}
            fill={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            stackId={stacked ? "stack" : s.stackId}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
