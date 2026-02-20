import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Sprout, 
  Truck, 
  Phone, 
  LandPlot,
  ShoppingBag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Add Crop',
      icon: Plus,
      color: 'bg-primary hover:bg-primary/90 text-primary-foreground',
      onClick: () => navigate('/farmer/crops'),
    },
    {
      label: 'Add Farmland',
      icon: LandPlot,
      color: 'bg-amber-600 hover:bg-amber-700 text-white',
      onClick: () => navigate('/farmer/farmlands'),
    },
    {
      label: 'Request Transport',
      icon: Truck,
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      onClick: () => navigate('/farmer/transport'),
    },
    {
      label: 'Create Listing',
      icon: ShoppingBag,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      onClick: () => navigate('/farmer/listings'),
    },
    {
      label: 'Call Agent',
      icon: Phone,
      color: 'bg-purple-600 hover:bg-purple-700 text-white',
      onClick: () => {
        window.location.href = 'tel:+919876543210';
      },
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              onClick={action.onClick}
              className={`h-auto flex-col gap-2 py-4 px-3 shadow-sm ${action.color}`}
            >
              <action.icon className="h-6 w-6" />
              <span className="text-xs font-medium text-center leading-tight">
                {action.label}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
