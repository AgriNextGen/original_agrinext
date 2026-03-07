import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Plus, 
  Truck, 
  Phone, 
  LandPlot,
  ShoppingBag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFarmerAgent } from '@/hooks/useAgentAssignments';

const QuickActions = () => {
  const navigate = useNavigate();
  const { data: agentData } = useFarmerAgent();

  const staticActions = [
    {
      label: 'Add Crop',
      icon: Plus,
      color: 'bg-primary hover:bg-primary/90 text-primary-foreground',
      onClick: () => navigate('/farmer/crops'),
      disabled: false,
      tooltip: null,
    },
    {
      label: 'Add Farmland',
      icon: LandPlot,
      color: 'bg-amber-600 hover:bg-amber-700 text-white',
      onClick: () => navigate('/farmer/farmlands'),
      disabled: false,
      tooltip: null,
    },
    {
      label: 'Request Transport',
      icon: Truck,
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      onClick: () => navigate('/farmer/transport'),
      disabled: false,
      tooltip: null,
    },
    {
      label: 'Create Listing',
      icon: ShoppingBag,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      onClick: () => navigate('/farmer/listings'),
      disabled: false,
      tooltip: null,
    },
  ];

  const agentPhone = agentData?.agent_phone;
  const callAgentAction = {
    label: 'Call Agent',
    icon: Phone,
    color: agentPhone
      ? 'bg-purple-600 hover:bg-purple-700 text-white'
      : 'bg-muted text-muted-foreground cursor-not-allowed',
    onClick: () => {
      if (agentPhone) window.location.href = `tel:${agentPhone}`;
    },
    disabled: !agentPhone,
    tooltip: agentPhone ? null : 'No agent assigned',
  };

  const actions = [...staticActions, callAgentAction];

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {actions.map((action) =>
              action.tooltip ? (
                <Tooltip key={action.label}>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        disabled={action.disabled}
                        className={`w-full h-auto flex-col gap-2 py-4 px-3 shadow-sm ${action.color}`}
                      >
                        <action.icon className="h-6 w-6" />
                        <span className="text-xs font-medium text-center leading-tight">
                          {action.label}
                        </span>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{action.tooltip}</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  key={action.label}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`h-auto flex-col gap-2 py-4 px-3 shadow-sm ${action.color}`}
                >
                  <action.icon className="h-6 w-6" />
                  <span className="text-xs font-medium text-center leading-tight">
                    {action.label}
                  </span>
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default QuickActions;
