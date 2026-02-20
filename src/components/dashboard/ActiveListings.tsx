import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Listing {
  id: string;
  title: string;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  imageUrl: string;
  views: number;
  isActive: boolean;
}

const mockListings: Listing[] = [
  { id: '1', title: 'Organic Tomatoes', category: 'Vegetables', price: 50, quantity: 500, unit: 'kg', imageUrl: '', views: 124, isActive: true },
  { id: '2', title: 'Fresh Onions', category: 'Vegetables', price: 40, quantity: 1000, unit: 'kg', imageUrl: '', views: 89, isActive: true },
  { id: '3', title: 'Green Chilies', category: 'Vegetables', price: 60, quantity: 200, unit: 'kg', imageUrl: '', views: 56, isActive: true },
  { id: '4', title: 'Basmati Rice', category: 'Grains', price: 120, quantity: 2000, unit: 'kg', imageUrl: '', views: 203, isActive: true },
];

const ActiveListings = () => {
  return (
    <div className="bg-card rounded-xl border border-border shadow-soft">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <h3 className="font-display font-semibold text-lg text-foreground">Active Listings</h3>
        <Link to="/farmer/listings/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        </Link>
      </div>
      <div className="p-6 grid gap-4">
        {mockListings.map((listing) => (
          <div 
            key={listing.id} 
            className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="w-16 h-16 rounded-lg bg-gradient-earth flex items-center justify-center">
              <span className="text-2xl">🌾</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-foreground truncate">{listing.title}</h4>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {listing.category}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                ₹{listing.price}/{listing.unit} • {listing.quantity} {listing.unit} available
              </p>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" />
                {listing.views} views
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveListings;
