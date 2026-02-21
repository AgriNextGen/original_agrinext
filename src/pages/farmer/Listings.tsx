import { useState, useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  MoreVertical,
  Package,
  Filter,
  QrCode,
  Camera
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import ListingTraceQR from '@/components/listings/ListingTraceQR';
import CropSourceSelector from '@/components/listings/CropSourceSelector';
import TraceSettingsPanel from '@/components/listings/TraceSettingsPanel';
import EvidenceUploadSection from '@/components/listings/EvidenceUploadSection';
import { useHarvestReadyCrops, TraceSettings, DEFAULT_TRACE_SETTINGS } from '@/hooks/useTraceability';
import GeoDistrictSelect from '@/components/geo/GeoDistrictSelect';

interface Listing {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  location: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  trace_code: string | null;
  trace_status: string;
  inputs_summary: string | null;
  test_report_urls: unknown;
  crop_id: string | null;
  trace_settings: TraceSettings | null;
}

const categories = ['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Dairy', 'Spices', 'Other'];

const FarmerListings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [sourceMode, setSourceMode] = useState<'crop' | 'custom'>('crop');
  const [selectedCropId, setSelectedCropId] = useState('');
  const [traceSettings, setTraceSettings] = useState<TraceSettings>(DEFAULT_TRACE_SETTINGS);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    quantity: '',
    unit: 'kg',
    location: '',
    geo_district_id: '',
  });

  // Evidence section state - shown after listing is saved
  const [showEvidenceForListing, setShowEvidenceForListing] = useState<string | null>(null);

  const { data: harvestCrops = [], isLoading: cropsLoading } = useHarvestReadyCrops();

  useEffect(() => {
    if (user) fetchListings();
  }, [user]);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings((data || []) as unknown as Listing[]);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast({ title: t('common.error'), description: t('farmer.listings.fetchError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCropSelect = (cropId: string) => {
    setSelectedCropId(cropId);
    const crop = harvestCrops.find(c => c.id === cropId);
    if (!crop) return;

    // Auto-fill from crop data
    const title = crop.variety ? `${crop.crop_name} (${crop.variety})` : crop.crop_name;
    const location = crop.farmland
      ? [crop.farmland.village, crop.farmland.district].filter(Boolean).join(', ')
      : '';

    setFormData({
      ...formData,
      title,
      quantity: crop.estimated_quantity?.toString() || '',
      unit: crop.quantity_unit || 'kg',
      location,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const listingData: any = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        price: parseFloat(formData.price),
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        location: formData.location || null,
        seller_id: user?.id,
        trace_settings: traceSettings,
        geo_district_id: formData.geo_district_id || null,
      };

      if (sourceMode === 'crop' && selectedCropId) {
        listingData.crop_id = selectedCropId;
      }

      if (editingListing) {
        const { error } = await supabase
          .from('listings')
          .update(listingData)
          .eq('id', editingListing.id);

        if (error) throw error;
        toast({ title: t('common.success'), description: t('farmer.listings.updateSuccess') });
      } else {
        const { data: newListing, error } = await supabase
          .from('listings')
          .insert([listingData])
          .select()
          .single();

        if (error) throw error;
        toast({ title: t('common.success'), description: t('farmer.listings.createSuccess') });

        // After creation, offer evidence upload
        if (newListing) {
          setShowEvidenceForListing(newListing.id);
        }
      }

      setIsDialogOpen(false);
      resetForm();
      fetchListings();
    } catch (error) {
      console.error('Error saving listing:', error);
      toast({ title: t('common.error'), description: t('farmer.listings.saveError'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('listings').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('common.success'), description: t('farmer.listings.deleteSuccess') });
      fetchListings();
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast({ title: t('common.error'), description: t('farmer.listings.deleteError'), variant: 'destructive' });
    }
  };

  const handleEdit = (listing: Listing) => {
    setEditingListing(listing);
    setSourceMode(listing.crop_id ? 'crop' : 'custom');
    setSelectedCropId(listing.crop_id || '');
    setTraceSettings(listing.trace_settings || DEFAULT_TRACE_SETTINGS);
    setFormData({
      title: listing.title,
      description: listing.description || '',
      category: listing.category,
      price: listing.price.toString(),
      quantity: listing.quantity.toString(),
      unit: listing.unit,
      location: listing.location || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', category: '', price: '', quantity: '', unit: 'kg', location: '', geo_district_id: '' });
    setEditingListing(null);
    setSourceMode('crop');
    setSelectedCropId('');
    setTraceSettings(DEFAULT_TRACE_SETTINGS);
  };

  const toggleListingStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('listings').update({ is_active: !currentStatus }).eq('id', id);
      if (error) throw error;
      toast({ title: t('common.success'), description: !currentStatus ? t('farmer.listings.activated') : t('farmer.listings.deactivated') });
      fetchListings();
    } catch (error) {
      console.error('Error updating listing status:', error);
      toast({ title: t('common.error'), description: t('farmer.listings.statusError'), variant: 'destructive' });
    }
  };

  const handleTraceCodeGenerated = (listingId: string, traceCode: string) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, trace_code: traceCode } : l));
  };

  const handleTraceStatusChange = (listingId: string, newStatus: string) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, trace_status: newStatus } : l));
  };

  const filteredListings = listings.filter(listing =>
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout title={t('farmer.listings.title')}>
      <PageHeader title={t('farmer.listings.title')}>
        <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('farmer.listings.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {t('common.filter')}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button variant="default" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('farmer.listings.addListing')}
                </Button>
              </DialogTrigger>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingListing ? t('farmer.listings.editListing') : t('farmer.listings.addNewListing')}</DialogTitle>
                  <DialogDescription>
                    {editingListing ? t('farmer.listings.editDescription') : t('farmer.listings.addDescription')}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Crop Source Selector (only on create) */}
                  {!editingListing && (
                    <CropSourceSelector
                      crops={harvestCrops}
                      isLoading={cropsLoading}
                      selectedCropId={selectedCropId}
                      onSelectCrop={handleCropSelect}
                      sourceMode={sourceMode}
                      onSourceModeChange={setSourceMode}
                    />
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="title">{t('farmer.listings.productName')}</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={t('farmer.listings.productNamePlaceholder')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{t('farmer.listings.description')}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('farmer.listings.descriptionPlaceholder')}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">{t('farmer.listings.category')}</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('farmer.listings.selectCategory')} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{t(`enum.categories.${cat.toLowerCase()}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">{t('farmer.listings.location')}</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder={t('farmer.listings.locationPlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>District</Label>
                      <GeoDistrictSelect
                        value={formData.geo_district_id}
                        onValueChange={(v) => setFormData({ ...formData, geo_district_id: v })}
                        placeholder="Select listing district"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">{t('farmer.listings.price')}</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">{t('farmer.listings.quantity')}</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="100"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">{t('common.unit')}</Label>
                      <Select
                        value={formData.unit}
                        onValueChange={(value) => setFormData({ ...formData, unit: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">{t('enum.units.kg')}</SelectItem>
                          <SelectItem value="quintal">{t('enum.units.quintals')}</SelectItem>
                          <SelectItem value="ton">{t('enum.units.tonnes')}</SelectItem>
                          <SelectItem value="piece">{t('enum.units.piece')}</SelectItem>
                          <SelectItem value="dozen">{t('enum.units.dozen')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Trace Settings */}
                  <TraceSettingsPanel settings={traceSettings} onChange={setTraceSettings} />

                  {/* Evidence upload - only when editing an existing listing */}
                   {editingListing && (
                    <EvidenceUploadSection listingId={editingListing.id} cropId={editingListing.crop_id} />
                  )}

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" variant="default" disabled={isSubmitting}>
                      {isSubmitting ? t('common.saving') : (editingListing ? t('farmer.listings.updateListing') : t('farmer.listings.createListing'))}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Evidence upload dialog for newly created listing */}
        {showEvidenceForListing && (
          <Dialog open={!!showEvidenceForListing} onOpenChange={() => setShowEvidenceForListing(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Evidence (Optional)</DialogTitle>
                <DialogDescription>
                  Upload photos or reports to strengthen your listing's traceability
                </DialogDescription>
              </DialogHeader>
              <EvidenceUploadSection listingId={showEvidenceForListing} cropId={listings.find(l => l.id === showEvidenceForListing)?.crop_id} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEvidenceForListing(null)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6 animate-pulse">
                <div className="h-32 bg-muted rounded-lg mb-4" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t('farmer.listings.noListingsYet')}
            description={t('farmer.listings.startSelling')}
            actionLabel={t('farmer.listings.addFirstListing')}
            onAction={() => setIsDialogOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="bg-card rounded-xl border border-border overflow-hidden shadow-soft hover:shadow-medium transition-shadow">
                <div className="h-32 bg-gradient-earth flex items-center justify-center relative">
                  <span className="text-4xl">🌾</span>
                  {listing.crop_id && (
                    <Badge className="absolute top-2 left-2 bg-primary/80 text-xs">Crop-linked</Badge>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{listing.title}</h3>
                      <Badge variant="outline" className="mt-1 bg-primary/10 text-primary border-primary/20">
                        {listing.category}
                      </Badge>
                    </div>
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button aria-label="Listing menu" variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(listing)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowEvidenceForListing(listing.id)}>
                          <Camera className="h-4 w-4 mr-2" />
                          Add Evidence
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleListingStatus(listing.id, listing.is_active)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {listing.is_active ? t('farmer.listings.deactivate') : t('farmer.listings.activate')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(listing.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {listing.description || t('farmer.listings.noDescription')}
                  </p>
                  {/* Trace QR Section */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <QrCode className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground flex-1">
                      {listing.trace_code || 'No trace code'}
                    </span>
                    <ListingTraceQR
                      listingId={listing.id}
                      traceCode={listing.trace_code}
                      traceStatus={listing.trace_status || 'published'}
                      productName={listing.title}
                      onTraceCodeGenerated={(code) => handleTraceCodeGenerated(listing.id, code)}
                      onStatusChange={(status) => handleTraceStatusChange(listing.id, status)}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        ₹{listing.price}/{listing.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {listing.quantity} {listing.unit} {t('farmer.listings.available')}
                      </p>
                    </div>
                    <Badge variant={listing.is_active ? 'default' : 'secondary'}>
                      {listing.is_active ? t('farmer.listings.active') : t('farmer.listings.inactive')}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </PageHeader>
    </DashboardLayout>
  );
};

export default FarmerListings;
