import { useState, useEffect } from 'react';
import { MapPin, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useKarnatakaDistricts,
  useFarmerNeedsDistrict,
  useUpdateFarmerLocation,
} from '@/hooks/useKarnatakaDistricts';
import { useAuth } from '@/hooks/useAuth';

const FarmerLocationPrompt = () => {
  const { user, userRole } = useAuth();
  const { data: districts, isLoading: districtsLoading } = useKarnatakaDistricts();
  const { data: needsDistrictData, isLoading: checkLoading } = useFarmerNeedsDistrict();
  const updateLocation = useUpdateFarmerLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [pincode, setPincode] = useState('');

  // Only show for farmers who need to set their district
  useEffect(() => {
    if (
      userRole === 'farmer' &&
      !checkLoading &&
      needsDistrictData?.needsDistrict &&
      !isDismissed
    ) {
      // Small delay to not overwhelm user immediately
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [userRole, checkLoading, needsDistrictData, isDismissed]);

  // Pre-fill village from profile if available
  useEffect(() => {
    if (needsDistrictData?.profile?.village) {
      setVillage(needsDistrictData.profile.village);
    }
  }, [needsDistrictData]);

  const handleSave = async () => {
    if (!selectedDistrict) return;

    await updateLocation.mutateAsync({
      district: selectedDistrict,
      village: village.trim() || undefined,
      pincode: pincode.trim() || undefined,
      district_source: 'user',
      district_confidence: 'high',
    });

    setIsOpen(false);
  };

  const handleSkip = () => {
    setIsDismissed(true);
    setIsOpen(false);
  };

  // Don't render anything if not applicable
  if (
    userRole !== 'farmer' ||
    checkLoading ||
    !needsDistrictData?.needsDistrict ||
    isDismissed
  ) {
    return null;
  }

  return (
    <>
      {/* Subtle banner when dialog is closed but district still needed */}
      {!isOpen && needsDistrictData?.needsDistrict && (
        <Alert 
          className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 cursor-pointer"
          onClick={() => setIsOpen(true)}
        >
          <MapPin className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200 flex items-center justify-between">
            <span>
              <strong>Set your district</strong> to see local mandi prices and advisories
            </span>
            <Button variant="outline" size="sm" className="ml-4 shrink-0">
              Set Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Set Your Location
            </DialogTitle>
            <DialogDescription>
              We'll use this to show you local mandi prices, weather forecasts, and relevant advisories.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* District Selection - Required */}
            <div className="space-y-2">
              <Label htmlFor="district" className="flex items-center gap-1">
                District <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedDistrict}
                onValueChange={setSelectedDistrict}
                disabled={districtsLoading}
              >
                <SelectTrigger id="district">
                  <SelectValue placeholder={districtsLoading ? 'Loading...' : 'Select your district'} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {districts?.map((d) => (
                    <SelectItem key={d.id} value={d.district}>
                      {d.district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Village - Optional */}
            <div className="space-y-2">
              <Label htmlFor="village">Village (Optional)</Label>
              <Input
                id="village"
                placeholder="Enter your village name"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
              />
            </div>

            {/* Pincode - Optional */}
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode (Optional)</Label>
              <Input
                id="pincode"
                placeholder="e.g., 560001"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Pincode can help us provide more accurate local data
              </p>
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedDistrict || updateLocation.isPending}
            >
              {updateLocation.isPending ? 'Saving...' : 'Save Location'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FarmerLocationPrompt;
