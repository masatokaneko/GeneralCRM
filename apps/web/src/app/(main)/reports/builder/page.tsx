"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  GripVertical,
  Plus,
  X,
  Play,
  Save,
  Filter,
  Columns,
  Group,
  SortAsc,
  SortDesc,
  ChevronDown,
  ChevronRight,
  Table,
  BarChart3,
  PieChart,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Badge } from "@/components/atoms/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useOpportunities } from "@/lib/api/opportunities";
import { BarChart, PieChart as PieChartComponent } from "@/components/organisms/charts";

type ReportObject = "Opportunity" | "Account" | "Lead" | "Contact" | "Campaign";

interface Field {
  id: string;
  name: string;
  label: string;
  type: "text" | "number" | "date" | "currency" | "percent" | "boolean";
  object: ReportObject;
}

interface SelectedField extends Field {
  sortDirection?: "asc" | "desc";
}

interface FilterConfig {
  fieldId: string;
  operator: string;
  value: string;
}

interface GroupConfig {
  fieldId: string;
  dateGrouping?: "day" | "week" | "month" | "quarter" | "year";
}

const AVAILABLE_FIELDS: Field[] = [
  { id: "opp_name", name: "name", label: "Opportunity Name", type: "text", object: "Opportunity" },
  { id: "opp_amount", name: "amount", label: "Amount", type: "currency", object: "Opportunity" },
  { id: "opp_stage", name: "stageName", label: "Stage", type: "text", object: "Opportunity" },
  { id: "opp_probability", name: "probability", label: "Probability", type: "percent", object: "Opportunity" },
  { id: "opp_closeDate", name: "closeDate", label: "Close Date", type: "date", object: "Opportunity" },
  { id: "opp_isClosed", name: "isClosed", label: "Is Closed", type: "boolean", object: "Opportunity" },
  { id: "opp_isWon", name: "isWon", label: "Is Won", type: "boolean", object: "Opportunity" },
  { id: "opp_accountName", name: "accountName", label: "Account Name", type: "text", object: "Opportunity" },
  { id: "opp_ownerName", name: "ownerName", label: "Owner", type: "text", object: "Opportunity" },
  { id: "opp_createdAt", name: "createdAt", label: "Created Date", type: "date", object: "Opportunity" },
];

const FILTER_OPERATORS = {
  text: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "contains", label: "contains" },
    { value: "starts_with", label: "starts with" },
  ],
  number: [
    { value: "equals", label: "=" },
    { value: "not_equals", label: "!=" },
    { value: "greater_than", label: ">" },
    { value: "less_than", label: "<" },
    { value: "greater_equal", label: ">=" },
    { value: "less_equal", label: "<=" },
  ],
  currency: [
    { value: "equals", label: "=" },
    { value: "not_equals", label: "!=" },
    { value: "greater_than", label: ">" },
    { value: "less_than", label: "<" },
  ],
  percent: [
    { value: "equals", label: "=" },
    { value: "greater_than", label: ">" },
    { value: "less_than", label: "<" },
  ],
  date: [
    { value: "equals", label: "equals" },
    { value: "before", label: "before" },
    { value: "after", label: "after" },
    { value: "this_month", label: "this month" },
    { value: "this_quarter", label: "this quarter" },
  ],
  boolean: [
    { value: "equals", label: "is" },
  ],
};

interface DraggableFieldProps {
  field: Field;
  onAdd: (field: Field) => void;
}

function DraggableField({ field, onAdd }: DraggableFieldProps) {
  return (
    <button
      type="button"
      onClick={() => onAdd(field)}
      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left rounded hover:bg-muted transition-colors"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("field", JSON.stringify(field));
      }}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span>{field.label}</span>
      <Badge variant="outline" className="ml-auto text-xs">
        {field.type}
      </Badge>
    </button>
  );
}

interface SelectedFieldItemProps {
  field: SelectedField;
  index: number;
  onRemove: () => void;
  onSort: (direction: "asc" | "desc" | undefined) => void;
}

function SelectedFieldItem({ field, index, onRemove, onSort }: SelectedFieldItemProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded">
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
      <span className="text-sm font-medium flex-1">{field.label}</span>
      <button
        type="button"
        onClick={() => {
          if (!field.sortDirection) onSort("asc");
          else if (field.sortDirection === "asc") onSort("desc");
          else onSort(undefined);
        }}
        className={cn(
          "p-1 rounded hover:bg-background",
          field.sortDirection && "text-primary"
        )}
      >
        {field.sortDirection === "desc" ? (
          <SortDesc className="h-4 w-4" />
        ) : (
          <SortAsc className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

type ReportView = "table" | "bar" | "pie";

interface ChartViewProps {
  data: Record<string, { records: Record<string, unknown>[]; totals: Record<string, number> }>;
  groupBy: GroupConfig | null;
  selectedFields: SelectedField[];
  formatValue: (value: unknown, type: Field["type"]) => string;
}

function BarChartView({ data, groupBy, selectedFields }: ChartViewProps) {
  const numericField = selectedFields.find(
    (f) => f.type === "currency" || f.type === "number" || f.type === "percent"
  );

  if (!numericField) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Add a numeric field (Amount, Probability, etc.) to display a bar chart
      </div>
    );
  }

  const chartData = Object.entries(data).map(([name, group]) => ({
    name: name,
    [numericField.label]: group.totals[numericField.name] ||
      group.records.reduce((sum, r) => sum + (Number(r[numericField.name]) || 0), 0),
  }));

  return (
    <div className="py-4">
      <BarChart
        data={chartData}
        series={[{ dataKey: numericField.label, name: numericField.label }]}
        height={350}
        formatValue={(value) =>
          numericField.type === "currency"
            ? new Intl.NumberFormat("ja-JP", {
                style: "currency",
                currency: "JPY",
                maximumFractionDigits: 0,
              }).format(value)
            : numericField.type === "percent"
              ? `${value}%`
              : String(value)
        }
      />
    </div>
  );
}

function PieChartView({ data, groupBy, selectedFields }: ChartViewProps) {
  const numericField = selectedFields.find(
    (f) => f.type === "currency" || f.type === "number" || f.type === "percent"
  );

  if (!numericField) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Add a numeric field (Amount, Probability, etc.) to display a pie chart
      </div>
    );
  }

  const chartData = Object.entries(data).map(([name, group]) => ({
    name: name,
    value: group.totals[numericField.name] ||
      group.records.reduce((sum, r) => sum + (Number(r[numericField.name]) || 0), 0),
  }));

  return (
    <div className="py-4">
      <PieChartComponent
        data={chartData}
        height={350}
        outerRadius={120}
        formatValue={(value) =>
          numericField.type === "currency"
            ? new Intl.NumberFormat("ja-JP", {
                style: "currency",
                currency: "JPY",
                maximumFractionDigits: 0,
              }).format(value)
            : numericField.type === "percent"
              ? `${value}%`
              : String(value)
        }
      />
    </div>
  );
}

export default function ReportBuilderPage() {
  const [reportName, setReportName] = React.useState("New Report");
  const [selectedObject, setSelectedObject] = React.useState<ReportObject>("Opportunity");
  const [selectedFields, setSelectedFields] = React.useState<SelectedField[]>([
    { ...AVAILABLE_FIELDS[0] },
    { ...AVAILABLE_FIELDS[1] },
    { ...AVAILABLE_FIELDS[2] },
  ]);
  const [filters, setFilters] = React.useState<FilterConfig[]>([]);
  const [groupBy, setGroupBy] = React.useState<GroupConfig | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [reportData, setReportData] = React.useState<Record<string, unknown>[] | null>(null);
  const [reportView, setReportView] = React.useState<ReportView>("table");
  const [expandedSections, setExpandedSections] = React.useState({
    fields: true,
    filters: true,
    grouping: false,
  });

  const { data: opportunitiesData, isLoading } = useOpportunities({ limit: 200 });

  const availableFields = AVAILABLE_FIELDS.filter((f) => f.object === selectedObject);

  const handleAddField = (field: Field) => {
    if (!selectedFields.find((f) => f.id === field.id)) {
      setSelectedFields([...selectedFields, { ...field }]);
    }
  };

  const handleRemoveField = (index: number) => {
    setSelectedFields(selectedFields.filter((_, i) => i !== index));
  };

  const handleSortField = (index: number, direction: "asc" | "desc" | undefined) => {
    const updated = [...selectedFields];
    updated[index] = { ...updated[index], sortDirection: direction };
    setSelectedFields(updated);
  };

  const handleAddFilter = () => {
    if (availableFields.length > 0) {
      const field = availableFields[0];
      const operators = FILTER_OPERATORS[field.type];
      setFilters([
        ...filters,
        {
          fieldId: field.id,
          operator: operators[0].value,
          value: "",
        },
      ]);
    }
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleUpdateFilter = (index: number, updates: Partial<FilterConfig>) => {
    const updated = [...filters];
    updated[index] = { ...updated[index], ...updates };
    setFilters(updated);
  };

  const handleRunReport = () => {
    setIsRunning(true);

    setTimeout(() => {
      let data = (opportunitiesData?.records || []) as unknown as Record<string, unknown>[];

      filters.forEach((filter) => {
        const field = AVAILABLE_FIELDS.find((f) => f.id === filter.fieldId);
        if (!field || !filter.value) return;

        data = data.filter((record) => {
          const value = record[field.name];
          const filterValue = filter.value;

          switch (filter.operator) {
            case "equals":
              return String(value).toLowerCase() === filterValue.toLowerCase();
            case "not_equals":
              return String(value).toLowerCase() !== filterValue.toLowerCase();
            case "contains":
              return String(value).toLowerCase().includes(filterValue.toLowerCase());
            case "starts_with":
              return String(value).toLowerCase().startsWith(filterValue.toLowerCase());
            case "greater_than":
              return Number(value) > Number(filterValue);
            case "less_than":
              return Number(value) < Number(filterValue);
            case "greater_equal":
              return Number(value) >= Number(filterValue);
            case "less_equal":
              return Number(value) <= Number(filterValue);
            default:
              return true;
          }
        });
      });

      const sortField = selectedFields.find((f) => f.sortDirection);
      if (sortField) {
        data = [...data].sort((a, b) => {
          const aVal = a[sortField.name];
          const bVal = b[sortField.name];
          const direction = sortField.sortDirection === "asc" ? 1 : -1;

          if (sortField.type === "number" || sortField.type === "currency" || sortField.type === "percent") {
            return ((Number(aVal) || 0) - (Number(bVal) || 0)) * direction;
          }
          return String(aVal || "").localeCompare(String(bVal || "")) * direction;
        });
      }

      setReportData(data);
      setIsRunning(false);
    }, 500);
  };

  const formatValue = (value: unknown, type: Field["type"]) => {
    if (value === null || value === undefined) return "-";
    switch (type) {
      case "currency":
        return new Intl.NumberFormat("ja-JP", {
          style: "currency",
          currency: "JPY",
          maximumFractionDigits: 0,
        }).format(Number(value));
      case "percent":
        return `${value}%`;
      case "date":
        return new Date(String(value)).toLocaleDateString("ja-JP");
      case "boolean":
        return value ? "Yes" : "No";
      default:
        return String(value);
    }
  };

  const groupedData = React.useMemo(() => {
    if (!reportData || !groupBy) return null;

    const field = AVAILABLE_FIELDS.find((f) => f.id === groupBy.fieldId);
    if (!field) return null;

    const groups: Record<string, { records: Record<string, unknown>[]; totals: Record<string, number> }> = {};

    reportData.forEach((record) => {
      const groupValue = String(record[field.name] || "Unknown");
      if (!groups[groupValue]) {
        groups[groupValue] = { records: [], totals: {} };
      }
      groups[groupValue].records.push(record);

      selectedFields.forEach((sf) => {
        if (sf.type === "currency" || sf.type === "number") {
          groups[groupValue].totals[sf.name] = (groups[groupValue].totals[sf.name] || 0) + (Number(record[sf.name]) || 0);
        }
      });
    });

    return groups;
  }, [reportData, groupBy, selectedFields]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({ ...expandedSections, [section]: !expandedSections[section] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Reports
            </Button>
          </Link>
          <div>
            <Input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="text-lg font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
            />
            <p className="text-sm text-muted-foreground">
              Drag fields to build your report
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg">
            <button
              type="button"
              onClick={() => setReportView("table")}
              className={cn(
                "p-2 rounded-l-lg",
                reportView === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <Table className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setReportView("bar")}
              className={cn(
                "p-2",
                reportView === "bar" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setReportView("pie")}
              className={cn(
                "p-2 rounded-r-lg",
                reportView === "pie" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <PieChart className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button onClick={handleRunReport} disabled={isRunning || selectedFields.length === 0}>
            {isRunning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run Report
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Sidebar - Field Selection */}
        <div className="space-y-4">
          {/* Available Fields */}
          <Card>
            <CardHeader className="py-3">
              <button
                type="button"
                onClick={() => toggleSection("fields")}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="text-sm flex items-center gap-2">
                  <Columns className="h-4 w-4" />
                  Available Fields
                </CardTitle>
                {expandedSections.fields ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </CardHeader>
            {expandedSections.fields && (
              <CardContent className="pt-0">
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {availableFields.map((field) => (
                    <DraggableField
                      key={field.id}
                      field={field}
                      onAdd={handleAddField}
                    />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader className="py-3">
              <button
                type="button"
                onClick={() => toggleSection("filters")}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="text-sm flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
                {expandedSections.filters ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </CardHeader>
            {expandedSections.filters && (
              <CardContent className="pt-0 space-y-3">
                {filters.map((filter, index) => {
                  const field = AVAILABLE_FIELDS.find((f) => f.id === filter.fieldId);
                  if (!field) return null;
                  const operators = FILTER_OPERATORS[field.type];

                  return (
                    <div key={`filter-${index}`} className="space-y-2 p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <select
                          value={filter.fieldId}
                          onChange={(e) => handleUpdateFilter(index, { fieldId: e.target.value })}
                          className="flex-1 text-sm rounded border bg-background px-2 py-1"
                        >
                          {availableFields.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter(index)}
                          className="p-1 hover:bg-background rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={filter.operator}
                          onChange={(e) => handleUpdateFilter(index, { operator: e.target.value })}
                          className="text-sm rounded border bg-background px-2 py-1"
                        >
                          {operators.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={filter.value}
                          onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
                          placeholder="Value"
                          className="flex-1 h-8 text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddFilter}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Filter
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Grouping */}
          <Card>
            <CardHeader className="py-3">
              <button
                type="button"
                onClick={() => toggleSection("grouping")}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="text-sm flex items-center gap-2">
                  <Group className="h-4 w-4" />
                  Group By
                </CardTitle>
                {expandedSections.grouping ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </CardHeader>
            {expandedSections.grouping && (
              <CardContent className="pt-0">
                <select
                  value={groupBy?.fieldId || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setGroupBy({ fieldId: e.target.value });
                    } else {
                      setGroupBy(null);
                    }
                  }}
                  className="w-full text-sm rounded border bg-background px-2 py-2"
                >
                  <option value="">No grouping</option>
                  {availableFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Selected Columns */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Selected Columns</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {selectedFields.length === 0 ? (
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const field = JSON.parse(e.dataTransfer.getData("field"));
                    handleAddField(field);
                  }}
                >
                  Drag fields here or click to add
                </div>
              ) : (
                <div
                  className="space-y-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const field = JSON.parse(e.dataTransfer.getData("field"));
                    handleAddField(field);
                  }}
                >
                  {selectedFields.map((field, index) => (
                    <SelectedFieldItem
                      key={field.id}
                      field={field}
                      index={index}
                      onRemove={() => handleRemoveField(index)}
                      onSort={(direction) => handleSortField(index, direction)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Results */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">
                Report Results
                {reportData && (
                  <span className="ml-2 text-muted-foreground font-normal">
                    ({reportData.length} records)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !reportData ? (
                <div className="text-center py-12 text-muted-foreground">
                  Click &quot;Run Report&quot; to see results
                </div>
              ) : reportData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No records found matching your criteria
                </div>
              ) : reportView === "table" ? (
                <div className="overflow-x-auto">
                  {groupedData ? (
                    <div className="space-y-4">
                      {Object.entries(groupedData).map(([groupName, group]) => (
                        <div key={groupName} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted px-4 py-2 font-medium flex justify-between">
                            <span>{groupName}</span>
                            <span className="text-muted-foreground">
                              {group.records.length} records
                            </span>
                          </div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                {selectedFields.map((field) => (
                                  <th
                                    key={field.id}
                                    className="px-4 py-2 text-left font-medium"
                                  >
                                    {field.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {group.records.map((record, idx) => (
                                <tr key={`row-${idx}`} className="border-b">
                                  {selectedFields.map((field) => (
                                    <td key={field.id} className="px-4 py-2">
                                      {formatValue(record[field.name], field.type)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                              <tr className="bg-muted/30 font-medium">
                                {selectedFields.map((field, idx) => (
                                  <td key={field.id} className="px-4 py-2">
                                    {idx === 0
                                      ? "Subtotal"
                                      : group.totals[field.name] !== undefined
                                        ? formatValue(group.totals[field.name], field.type)
                                        : ""}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted">
                          {selectedFields.map((field) => (
                            <th
                              key={field.id}
                              className="px-4 py-2 text-left font-medium"
                            >
                              {field.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.slice(0, 50).map((record, idx) => (
                          <tr key={`row-${idx}`} className="border-b hover:bg-muted/50">
                            {selectedFields.map((field) => (
                              <td key={field.id} className="px-4 py-2">
                                {formatValue(record[field.name], field.type)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {reportData.length > 50 && !groupedData && (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      Showing first 50 of {reportData.length} records
                    </p>
                  )}
                </div>
              ) : reportView === "bar" ? (
                <BarChartView
                  data={groupedData || { All: { records: reportData, totals: {} } }}
                  groupBy={groupBy}
                  selectedFields={selectedFields}
                  formatValue={formatValue}
                />
              ) : (
                <PieChartView
                  data={groupedData || { All: { records: reportData, totals: {} } }}
                  groupBy={groupBy}
                  selectedFields={selectedFields}
                  formatValue={formatValue}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
