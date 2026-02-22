import { useFarmerProfile, useDashboardStats, useFarmlands } from '@/hooks/useFarmerDashboard';
import { MapPin, Sprout, Truck, Wheat, LandPlot, CheckCircle, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const FarmerSummaryCard = ({ dashboardData }: { dashboardData?: any } ) => {
  const { data: profile, isLoading: profileLoading } = useFarmerProfile();
  const { data: farmlands } = useFarmlands();
  const { activeCrops, readyToHarvest, pendingTransport, isLoading: statsLoading } = useDashboardStats();
  const remote = dashboardData || null;
  const navigate = useNavigate();
  const remoteActiveCrops = remote && remote.crops_by_status
    ? Object.values(remote.crops_by_status).reduce((s: any, v: any) => s + (v || 0), 0)
    : null;

  // Calculate profile completion
  const getProfileCompletion = () => {
    if (!profile) return 0;
    let completed = 0;
    const checks = [
      profile.full_name,
      profile.phone,
      profile.village,
      profile.district,
      farmlands && farmlands.length > 0,
    ];
    checks.forEach(check => { if (check) completed++; });
    return Math.round((completed / checks.length) * 100);
  };

  const profileCompletion = getProfileCompletion();
  const totalLandArea = farmlands?.reduce((sum, f) => sum + f.area, 0) || 0;

  if (profileLoading || statsLoading) {
    return (
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 rounded-2xl p-4 md:p-5 border border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-28" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { 
      label: 'Total Land', 
      value: `${totalLandArea.toFixed(1)} acres`, 
      icon: LandPlot, 
      color: 'text-amber-600 bg-amber-100' 
    },
    { 
      label: 'Active Crops', 
      value: String(remoteActiveCrops != null ? remoteActiveCrops : activeCrops), 
      icon: Sprout, 
      color: 'text-emerald-600 bg-emerald-100' 
    },
    { 
      label: 'Ready to Harvest', 
      value: readyToHarvest.toString(), 
      icon: Wheat, 
      color: 'text-primary bg-primary/10' 
    },
    { 
      label: 'Pending Transport', 
      value: (remote?.open_transport_requests_count != null ? remote.open_transport_requests_count : pendingTransport).toString(), 
      icon: Truck, 
      color: 'text-blue-600 bg-blue-100' 
    },
  ];

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 rounded-2xl p-4 md:p-5 border border-border shadow-soft">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 md:gap-5">
        {/* Farmer Info */}
        <div className="space-y-3 flex-1 min-w-0">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground leading-tight">
              Welcome, {profile?.full_name || 'Farmer'}! 🌾
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {profile?.village && profile?.district 
                  ? `${profile.village}, ${profile.district}`
                  : 'Location not set'}
              </span>
            </div>
          </div>

          {/* Profile Completion */}
          {profileCompletion < 100 && (
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 border border-border/50 max-w-lg">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {profileCompletion >= 80 ? (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">Profile Completion</span>
                </div>
                <span className="text-sm text-muted-foreground">{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {profileCompletion < 40 
                  ? 'Complete your profile to unlock all features'
                  : profileCompletion < 80
                    ? 'Almost there! Add a few more details'
                    : 'Just a little more to complete your profile'}
              </p>
              <Button 
                variant="link" 
                size="sm" 
                className="p-0 h-auto mt-1 text-primary"
                onClick={() => navigate('/farmer/settings')}
              >
                Complete Profile →
              </Button>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 w-full lg:w-auto">
          {stats.map((stat) => (
            <div 
              key={stat.label}
              className="bg-card/80 backdrop-blur-sm rounded-xl p-3 border border-border/50 shadow-sm hover:shadow-md transition-shadow min-w-0"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-xl font-bold text-foreground leading-tight truncate">{stat.value}</p>
                  <p className="text-[11px] md:text-xs text-muted-foreground leading-tight mt-0.5">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FarmerSummaryCard;
