import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  TrendingUp, 
  ArrowDownRight,
  Package,
  Clock,
  CheckCircle,
  Plus,
  IndianRupee
} from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import EmptyState from '@/components/farmer/EmptyState';
import { useFarmerEarnings, useFarmerTransactions } from '@/hooks/useFarmerEarnings';
import { formatDistanceToNow } from 'date-fns';

const FarmerEarnings = () => {
  const navigate = useNavigate();
  const { data: earnings, isLoading: earningsLoading } = useFarmerEarnings();
  const { data: transactions, isLoading: transactionsLoading } = useFarmerTransactions(10);

  const isLoading = earningsLoading || transactionsLoading;

  // Check if farmer has any data
  const hasNoData = !isLoading && earnings?.completedOrders === 0 && earnings?.pendingOrders === 0;

  if (isLoading) {
    return (
      <DashboardLayout title="Earnings">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  // Empty state for new farmers
  if (hasNoData) {
    return (
      <DashboardLayout title="Earnings">
        <div className="space-y-6">
          {/* Stats showing zeros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Total Sales"
              value="₹0"
              change="From completed orders"
              changeType="neutral"
              icon={IndianRupee}
              iconColor="bg-primary/10 text-primary"
            />
            <StatsCard
              title="Pending Payments"
              value="₹0"
              change="From active orders"
              changeType="neutral"
              icon={Clock}
              iconColor="bg-amber-500/10 text-amber-600"
            />
            <StatsCard
              title="Completed Orders"
              value="0"
              change="Total fulfilled orders"
              changeType="neutral"
              icon={CheckCircle}
              iconColor="bg-emerald-500/10 text-emerald-600"
            />
          </div>

          {/* Empty State */}
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={DollarSign}
                title="No earnings yet"
                description="Start selling your produce to see your earnings here. Create a listing or complete an order to get started."
                actionLabel="Create a Listing"
                onAction={() => navigate('/farmer/listings')}
              />
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">How earnings work</h3>
                  <p className="text-muted-foreground text-sm">
                    When buyers purchase your produce through the marketplace, the payment will be tracked here. 
                    You'll see your total sales from completed orders and pending payments from active orders.
                  </p>
                  <div className="flex gap-3 mt-4">
                    <Button size="sm" onClick={() => navigate('/farmer/listings')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Listing
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate('/farmer/crops')}>
                      Manage Crops
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Real data view
  return (
    <DashboardLayout title="Earnings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Financial Overview</h2>
            <p className="text-muted-foreground">Track your earnings from marketplace sales</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Total Sales"
            value={`₹${(earnings?.totalSales || 0).toLocaleString('en-IN')}`}
            change={`${earnings?.completedOrders || 0} completed orders`}
            changeType={earnings?.totalSales && earnings.totalSales > 0 ? 'positive' : 'neutral'}
            icon={IndianRupee}
            iconColor="bg-primary/10 text-primary"
          />
          <StatsCard
            title="Pending Payments"
            value={`₹${(earnings?.pendingPayments || 0).toLocaleString('en-IN')}`}
            change={`${earnings?.pendingOrders || 0} pending orders`}
            changeType="neutral"
            icon={Clock}
            iconColor="bg-amber-500/10 text-amber-600"
          />
          <StatsCard
            title="Completed Orders"
            value={(earnings?.completedOrders || 0).toString()}
            change="Total fulfilled orders"
            changeType={earnings?.completedOrders && earnings.completedOrders > 0 ? 'positive' : 'neutral'}
            icon={CheckCircle}
            iconColor="bg-emerald-500/10 text-emerald-600"
          />
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary hover:text-primary/80"
              onClick={() => navigate('/farmer/orders')}
            >
              View All Orders
            </Button>
          </CardHeader>
          <CardContent>
            {!transactions || transactions.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <ArrowDownRight className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(transaction.date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">
                        +₹{transaction.amount.toLocaleString('en-IN')}
                      </p>
                      <Badge 
                        variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info about future features */}
        {earnings && (earnings.totalSales > 0 || earnings.pendingPayments > 0) && (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground text-center">
                💡 More detailed analytics, withdrawal options, and payment history are coming soon!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FarmerEarnings;
