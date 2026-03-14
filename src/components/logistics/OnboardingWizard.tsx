import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Truck, User, MapPin, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import GeoDistrictSelect from '@/components/geo/GeoDistrictSelect';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface OnboardingWizardProps {
  onComplete: (data: {
    name: string;
    phone?: string;
    vehicle_type?: string;
    vehicle_capacity?: string;
    operating_village?: string;
    operating_district?: string;
  }) => void;
  isSubmitting?: boolean;
  defaultName?: string;
}

const STEPS = ['profile', 'vehicle', 'area'] as const;

const vehicleTypes = [
  { value: 'truck', label: 'Truck' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'mini_truck', label: 'Mini Truck' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'tractor', label: 'Tractor Trolley' },
];

export default function OnboardingWizard({ onComplete, isSubmitting, defaultName }: OnboardingWizardProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: defaultName || '',
    phone: '',
    vehicle_type: '',
    vehicle_capacity: '',
    operating_village: '',
    operating_district: '',
  });

  const progress = ((step + 1) / STEPS.length) * 100;
  const canProceed = step === 0 ? formData.name.trim().length > 0 : true;

  const stepIcons = { profile: User, vehicle: Truck, area: MapPin };
  const stepLabels = {
    profile: t('logistics.profile') || 'Profile',
    vehicle: t('logistics.vehicle') || 'Vehicle',
    area: t('logistics.area') || 'Area',
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(formData);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">
            {t('logistics.welcomeTransporter') || 'Welcome, Transporter!'}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t('logistics.setupSteps') || 'Let\'s set up your profile in a few quick steps'}
          </p>
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('common.step') || 'Step'} {step + 1} / {STEPS.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = stepIcons[s];
              return (
                <div
                  key={s}
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
                    i < step ? 'bg-emerald-100 text-emerald-700' :
                    i === step ? 'bg-primary/10 text-primary' :
                    'bg-muted text-muted-foreground'
                  )}
                >
                  {i < step ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  {stepLabels[s]}
                </div>
              );
            })}
          </div>

          {/* Step 1: Profile */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ob-name">{t('logistics.fullName') || 'Full Name'} *</Label>
                <Input
                  id="ob-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('logistics.enterFullName') || 'Enter your full name'}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-phone">{t('logistics.phoneNumber') || 'Phone Number'}</Label>
                <Input
                  id="ob-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
          )}

          {/* Step 2: Vehicle */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('logistics.vehicleType') || 'Vehicle Type'}</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, vehicle_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('logistics.selectVehicleType') || 'Select vehicle type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-capacity">{t('logistics.capacityTons') || 'Capacity (tons)'}</Label>
                <Input
                  id="ob-capacity"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.vehicle_capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicle_capacity: e.target.value }))}
                  placeholder="e.g., 5"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('logistics.vehicleOptional') || 'You can skip this and add vehicles later'}
              </p>
            </div>
          )}

          {/* Step 3: Service Area */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ob-village">{t('logistics.operatingVillage') || 'Operating Village'}</Label>
                <Input
                  id="ob-village"
                  value={formData.operating_village}
                  onChange={(e) => setFormData(prev => ({ ...prev, operating_village: e.target.value }))}
                  placeholder={t('logistics.baseVillage') || 'Your base village'}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('logistics.operatingDistrict') || 'Operating District'}</Label>
                <GeoDistrictSelect
                  value={formData.operating_district}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, operating_district: v }))}
                  placeholder={t('logistics.selectDistrict') || 'Select district'}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('logistics.areaOptional') || 'You can manage more service areas from the Service Area page'}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 0}
              className={step === 0 ? 'invisible' : ''}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('common.back') || 'Back'}
            </Button>
            <Button onClick={handleNext} disabled={!canProceed || isSubmitting}>
              {step === STEPS.length - 1
                ? (isSubmitting ? (t('logistics.creatingProfile') || 'Creating...') : (t('logistics.createProfile') || 'Create Profile'))
                : (t('common.next') || 'Next')}
              {step < STEPS.length - 1 && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
