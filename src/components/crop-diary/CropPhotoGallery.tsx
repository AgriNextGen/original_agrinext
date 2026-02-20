import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Image, Download, Trash2, X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useCropMedia, useSignedUrl, useDeleteCropMedia, CropMedia } from '@/hooks/useCropDiary';
import ConfirmDialog from '@/components/ui/confirm-dialog';

interface CropPhotoGalleryProps {
  cropId: string;
}

const CropPhotoGallery = ({ cropId }: CropPhotoGalleryProps) => {
  const { data: media, isLoading } = useCropMedia(cropId);
  const signedUrlMutation = useSignedUrl();
  const deleteMutation = useDeleteCropMedia();

  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingMedia, setDeletingMedia] = useState<CropMedia | null>(null);

  // Load thumbnails
  useEffect(() => {
    const loadThumbnails = async () => {
      if (!media) return;

      const newThumbnails: Record<string, string> = {};
      for (const item of media) {
        if (!thumbnails[item.id]) {
          try {
            const url = await signedUrlMutation.mutateAsync(item.file_path);
            newThumbnails[item.id] = url;
          } catch (e) {
            console.error('Failed to load thumbnail:', e);
          }
        }
      }

      if (Object.keys(newThumbnails).length > 0) {
        setThumbnails((prev) => ({ ...prev, ...newThumbnails }));
      }
    };

    loadThumbnails();
  }, [media]);

  const openViewer = async (index: number) => {
    setSelectedIndex(index);
    const item = media?.[index];
    if (item) {
      const url = await signedUrlMutation.mutateAsync(item.file_path);
      setFullImageUrl(url);
      setViewerOpen(true);
    }
  };

  const navigateViewer = async (direction: 'prev' | 'next') => {
    if (!media) return;
    const newIndex = direction === 'next'
      ? (selectedIndex + 1) % media.length
      : (selectedIndex - 1 + media.length) % media.length;

    setSelectedIndex(newIndex);
    const url = await signedUrlMutation.mutateAsync(media[newIndex].file_path);
    setFullImageUrl(url);
  };

  const handleDownload = async (item: CropMedia) => {
    const url = await signedUrlMutation.mutateAsync(item.file_path);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crop-photo-${format(new Date(item.captured_at), 'yyyy-MM-dd')}.jpg`;
    link.click();
  };

  const handleDeleteClick = (item: CropMedia) => {
    setDeletingMedia(item);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMedia) return;
    await deleteMutation.mutateAsync({
      mediaId: deletingMedia.id,
      filePath: deletingMedia.file_path,
      cropId,
    });
    setDeleteConfirmOpen(false);
    setDeletingMedia(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Photo Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!media || media.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Photo Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No photos yet</p>
            <p className="text-sm">Upload your first crop photo to start the timeline</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Photo Gallery ({media.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {media.map((item, index) => (
              <div
                key={item.id}
                className="relative aspect-square group cursor-pointer rounded-lg overflow-hidden bg-muted"
                onClick={() => openViewer(index)}
              >
                {thumbnails[item.id] ? (
                  <img
                    src={thumbnails[item.id]}
                    alt={item.caption || 'Crop photo'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Skeleton className="w-full h-full" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {item.tags && item.tags.length > 0 && (
                  <div className="absolute bottom-1 left-1">
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      {item.tags[0].replace('_', ' ')}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full Screen Viewer */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative min-h-[60vh] flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
              onClick={() => setViewerOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            {media && media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 text-white hover:bg-white/20"
                  onClick={() => navigateViewer('prev')}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 text-white hover:bg-white/20"
                  onClick={() => navigateViewer('next')}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {fullImageUrl && (
              <img
                src={fullImageUrl}
                alt="Full view"
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}

            {media && media[selectedIndex] && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">
                      {format(new Date(media[selectedIndex].captured_at), 'PPP')}
                    </p>
                    {media[selectedIndex].caption && (
                      <p>{media[selectedIndex].caption}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={() => handleDownload(media[selectedIndex])}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:bg-red-500/20"
                      onClick={() => handleDeleteClick(media[selectedIndex])}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Photo"
        description="Are you sure you want to delete this photo? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </>
  );
};

export default CropPhotoGallery;
