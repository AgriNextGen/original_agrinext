import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jan', earnings: 12000 },
  { month: 'Feb', earnings: 19000 },
  { month: 'Mar', earnings: 15000 },
  { month: 'Apr', earnings: 25000 },
  { month: 'May', earnings: 22000 },
  { month: 'Jun', earnings: 30000 },
  { month: 'Jul', earnings: 28000 },
];

const EarningsChart = () => {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display font-semibold text-lg text-foreground">Earnings Overview</h3>
        <select className="text-sm bg-muted/50 border-0 rounded-lg px-3 py-1.5 text-foreground">
          <option>Last 7 months</option>
          <option>Last 12 months</option>
          <option>This year</option>
        </select>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 45%, 35%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 45%, 35%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 25%, 88%)" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(25, 15%, 45%)', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(25, 15%, 45%)', fontSize: 12 }}
              tickFormatter={(value) => `₹${value / 1000}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(45, 25%, 97%)', 
                border: '1px solid hsl(35, 25%, 88%)',
                borderRadius: '8px',
                boxShadow: '0 4px 20px -4px hsl(25 30% 12% / 0.08)'
              }}
              formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Earnings']}
            />
            <Area 
              type="monotone" 
              dataKey="earnings" 
              stroke="hsl(142, 45%, 35%)" 
              strokeWidth={2}
              fill="url(#earningsGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EarningsChart;
