import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SoilTestReport } from '@/hooks/useSoilReports';
import { format } from 'date-fns';

interface SoilTrendChartProps {
  reports: SoilTestReport[];
}

type MetricKey = 'ph' | 'nitrogen' | 'phosphorus' | 'potassium' | 'organic_carbon' | 'ec';

const metricConfig: Record<MetricKey, { label: string; color: string; unit: string }> = {
  ph: { label: 'pH', color: 'hsl(var(--primary))', unit: '' },
  nitrogen: { label: 'Nitrogen', color: '#22c55e', unit: ' kg/ha' },
  phosphorus: { label: 'Phosphorus', color: '#3b82f6', unit: ' kg/ha' },
  potassium: { label: 'Potassium', color: '#f97316', unit: ' kg/ha' },
  organic_carbon: { label: 'Organic Carbon', color: '#8b5cf6', unit: '%' },
  ec: { label: 'EC', color: '#ec4899', unit: ' dS/m' },
};

export default function SoilTrendChart({ reports }: SoilTrendChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('ph');

  // Filter reports that have data for the selected metric
  const chartData = reports
    .filter((r) => r[selectedMetric] != null)
    .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime())
    .map((r) => ({
      date: format(new Date(r.report_date), 'MMM yyyy'),
      value: r[selectedMetric] as number,
      fullDate: r.report_date,
    }));

  // Check which metrics have at least 2 data points
  const availableMetrics = (Object.keys(metricConfig) as MetricKey[]).filter((key) => {
    const count = reports.filter((r) => r[key] != null).length;
    return count >= 2;
  });

  if (availableMetrics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Add soil values in at least 2 reports to see trends</p>
      </div>
    );
  }

  // If selected metric doesn't have enough data, switch to first available
  if (!availableMetrics.includes(selectedMetric)) {
    setSelectedMetric(availableMetrics[0]);
  }

  const config = metricConfig[selectedMetric];

  return (
    <div className="space-y-4">
      <Tabs value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricKey)}>
        <TabsList className="flex-wrap h-auto">
          {(Object.keys(metricConfig) as MetricKey[]).map((key) => {
            const hasData = availableMetrics.includes(key);
            return (
              <TabsTrigger
                key={key}
                value={key}
                disabled={!hasData}
                className="text-xs"
              >
                {metricConfig[key].label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`${value}${config.unit}`, config.label]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              dot={{ fill: config.color, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
