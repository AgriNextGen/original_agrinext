 import { useState, useRef } from 'react';
 import { QRCodeSVG } from 'qrcode.react';
 import { Button } from '@/components/ui/button';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
 } from '@/components/ui/dialog';
 import { Badge } from '@/components/ui/badge';
 import { 
   QrCode, 
   Copy, 
   Download, 
   Check,
   ExternalLink,
   Eye,
   EyeOff
 } from 'lucide-react';
 import { useToast } from '@/hooks/use-toast';
 import { supabase } from '@/integrations/supabase/client';
 
 interface ListingTraceQRProps {
   listingId: string;
   traceCode: string | null;
   traceStatus: string;
   productName: string;
   onTraceCodeGenerated?: (traceCode: string) => void;
   onStatusChange?: (newStatus: string) => void;
 }
 
 const ListingTraceQR = ({ 
   listingId, 
   traceCode, 
   traceStatus,
   productName,
   onTraceCodeGenerated,
   onStatusChange
 }: ListingTraceQRProps) => {
   const { toast } = useToast();
   const [copied, setCopied] = useState(false);
   const [generating, setGenerating] = useState(false);
   const [updating, setUpdating] = useState(false);
   const qrRef = useRef<HTMLDivElement>(null);
 
   const baseUrl = window.location.origin;
   const traceUrl = traceCode ? `${baseUrl}/trace/listing/${traceCode}` : null;
 
   const handleCopyLink = async () => {
     if (!traceUrl) return;
     
     try {
       await navigator.clipboard.writeText(traceUrl);
       setCopied(true);
       toast({
         title: 'Link Copied!',
         description: 'Trace link copied to clipboard',
       });
       setTimeout(() => setCopied(false), 2000);
     } catch (err) {
       toast({
         title: 'Copy Failed',
         description: 'Please copy the link manually',
         variant: 'destructive',
       });
     }
   };
 
   const handleDownloadQR = () => {
     if (!qrRef.current || !traceCode) return;
 
     const svg = qrRef.current.querySelector('svg');
     if (!svg) return;
 
     // Create canvas from SVG
     const canvas = document.createElement('canvas');
     const ctx = canvas.getContext('2d');
     const svgData = new XMLSerializer().serializeToString(svg);
     const img = new Image();
     
     img.onload = () => {
       canvas.width = 300;
       canvas.height = 350;
       
       if (ctx) {
         // White background
         ctx.fillStyle = 'white';
         ctx.fillRect(0, 0, canvas.width, canvas.height);
         
         // Draw QR code centered
         ctx.drawImage(img, 50, 20, 200, 200);
         
         // Add text below QR
         ctx.fillStyle = 'black';
         ctx.font = 'bold 14px Arial';
         ctx.textAlign = 'center';
         ctx.fillText(productName.slice(0, 30), canvas.width / 2, 250);
         
         ctx.font = '12px Arial';
         ctx.fillStyle = '#666';
         ctx.fillText(traceCode, canvas.width / 2, 275);
         ctx.fillText('Scan to verify origin', canvas.width / 2, 295);
         
         ctx.font = '10px Arial';
         ctx.fillStyle = '#16a34a';
         ctx.fillText('Verified on AgriNext Gen', canvas.width / 2, 330);
       }
       
       // Download
       const link = document.createElement('a');
       link.download = `QR-${traceCode}.png`;
       link.href = canvas.toDataURL('image/png');
       link.click();
       
       toast({
         title: 'QR Downloaded',
         description: 'QR code saved as PNG',
       });
     };
     
     img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
   };
 
   const handleGenerateTraceCode = async () => {
     setGenerating(true);
     try {
       // The trigger will auto-generate, we just need to update to trigger it
       // For existing rows, we manually generate the code
       const year = new Date().getFullYear();
       
       // Get the next sequence number
       const { data: existingCodes } = await supabase
         .from('listings')
         .select('trace_code')
         .like('trace_code', `AGN-LST-${year}-%`);
       
       let maxSeq = 0;
       if (existingCodes) {
         existingCodes.forEach(row => {
           if (row.trace_code) {
             const match = row.trace_code.match(/AGN-LST-\d{4}-(\d+)/);
             if (match) {
               const seq = parseInt(match[1], 10);
               if (seq > maxSeq) maxSeq = seq;
             }
           }
         });
       }
       
       const newCode = `AGN-LST-${year}-${String(maxSeq + 1).padStart(6, '0')}`;
       
       const { error } = await supabase
         .from('listings')
         .update({ trace_code: newCode })
         .eq('id', listingId);
       
       if (error) throw error;
       
       toast({
         title: 'Trace Code Generated!',
         description: `Code: ${newCode}`,
       });
       
       onTraceCodeGenerated?.(newCode);
     } catch (err) {
       console.error('Error generating trace code:', err);
       toast({
         title: 'Generation Failed',
         description: 'Could not generate trace code',
         variant: 'destructive',
       });
     } finally {
       setGenerating(false);
     }
   };
 
   const handleToggleStatus = async () => {
     setUpdating(true);
     const newStatus = traceStatus === 'published' ? 'draft' : 'published';
     
     try {
       const { error } = await supabase
         .from('listings')
         .update({ trace_status: newStatus })
         .eq('id', listingId);
       
       if (error) throw error;
       
       toast({
         title: newStatus === 'published' ? 'Trace Published' : 'Trace Unpublished',
         description: newStatus === 'published' 
           ? 'Product trace is now publicly visible'
           : 'Product trace is now hidden from public',
       });
       
       onStatusChange?.(newStatus);
     } catch (err) {
       console.error('Error updating trace status:', err);
       toast({
         title: 'Update Failed',
         description: 'Could not update trace status',
         variant: 'destructive',
       });
     } finally {
       setUpdating(false);
     }
   };
 
   // If no trace code yet, show generate button
   if (!traceCode) {
     return (
       <Button 
         variant="outline" 
         size="sm" 
         onClick={handleGenerateTraceCode}
         disabled={generating}
         className="gap-2"
       >
         <QrCode className="h-4 w-4" />
         {generating ? 'Generating...' : 'Generate QR'}
       </Button>
     );
   }
 
   return (
     <div className="flex items-center gap-2">
       {/* Trace Status Badge */}
       <Badge 
         variant={traceStatus === 'published' ? 'default' : 'secondary'}
         className={traceStatus === 'published' ? 'bg-green-600' : ''}
       >
         {traceStatus === 'published' ? 'Public' : 'Draft'}
       </Badge>
       
       {/* QR Dialog */}
       <Dialog>
         <DialogTrigger asChild>
           <Button variant="outline" size="sm" className="gap-2">
             <QrCode className="h-4 w-4" />
             QR
           </Button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle>Product Trace QR Code</DialogTitle>
             <DialogDescription>
               Share this QR code for product traceability
             </DialogDescription>
           </DialogHeader>
           
           <div className="flex flex-col items-center space-y-4 py-4">
             {/* QR Code */}
             <div ref={qrRef} className="bg-white p-4 rounded-lg border">
               <QRCodeSVG 
                 value={traceUrl!}
                 size={180}
                 level="H"
                 includeMargin
               />
             </div>
             
             {/* Trace Code Display */}
             <div className="text-center">
               <p className="font-mono text-sm text-muted-foreground">{traceCode}</p>
               <p className="text-xs text-muted-foreground mt-1">{productName}</p>
             </div>
             
             {/* Public URL */}
             <div className="w-full">
               <p className="text-xs text-muted-foreground mb-1">Public Link:</p>
               <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs break-all">
                 <span className="flex-1 font-mono">{traceUrl}</span>
               </div>
             </div>
             
             {/* Action Buttons */}
             <div className="flex flex-wrap gap-2 w-full justify-center">
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={handleCopyLink}
                 className="gap-2"
               >
                 {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                 {copied ? 'Copied!' : 'Copy Link'}
               </Button>
               
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={handleDownloadQR}
                 className="gap-2"
               >
                 <Download className="h-4 w-4" />
                 Download QR
               </Button>
               
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => window.open(traceUrl!, '_blank')}
                 className="gap-2"
               >
                 <ExternalLink className="h-4 w-4" />
                 Preview
               </Button>
             </div>
             
             {/* Status Toggle */}
             <div className="w-full pt-4 border-t">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm font-medium">Public Visibility</p>
                   <p className="text-xs text-muted-foreground">
                     {traceStatus === 'published' 
                       ? 'Anyone with the link can view' 
                       : 'Hidden from public access'}
                   </p>
                 </div>
                 <Button
                   variant={traceStatus === 'published' ? 'default' : 'outline'}
                   size="sm"
                   onClick={handleToggleStatus}
                   disabled={updating}
                   className="gap-2"
                 >
                   {traceStatus === 'published' 
                     ? <><Eye className="h-4 w-4" /> Published</>
                     : <><EyeOff className="h-4 w-4" /> Draft</>
                   }
                 </Button>
               </div>
             </div>
           </div>
         </DialogContent>
       </Dialog>
       
       {/* Quick Copy Button */}
       <Button 
         variant="ghost" 
         size="icon"
         className="h-8 w-8"
         onClick={handleCopyLink}
         title="Copy trace link"
       >
         {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
       </Button>
     </div>
   );
 };
 
 export default ListingTraceQR;