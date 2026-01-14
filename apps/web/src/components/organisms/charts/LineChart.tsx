"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";

export interface LineChartDataPoint {
  name: string;
  [key: string]: string | number;
}

export interface LineChartSeries {
  dataKey: string;
  name: string;
  color?: string;
  strokeWidth?: number;
  dotted?: boolean;
}

export interface LineChartProps {
  data: LineChartDataPoint[];
  series: LineChartSeries[];
  height?: number;
  xAxisKey?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showDots?: boolean;
  curved?: boolean;
  formatValue?: (value: number) => string;
  formatXAxis?: (value: string) => string;
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

export function LineChart({
  data,
  series,
  height = 300,
  xAxisKey = "name",
  showGrid = true,
  showLegend = true,
  showDots = true,
  curved = true,
  formatValue,
  formatXAxis,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis
          dataKey={xAxisKey}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatXAxis}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatValue}
          className="text-muted-foreground"
        />
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        {showLegend && <Legend />}
        {series.map((s, index) => (
          <Line
            key={s.dataKey}
            type={curved ? "monotone" : "linear"}
            dataKey={s.dataKey}
            name={s.name}
            stroke={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            strokeWidth={s.strokeWidth || 2}
            strokeDasharray={s.dotted ? "5 5" : undefined}
            dot={showDots ? { r: 4, strokeWidth: 2 } : false}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
