import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  User,
  Phone,
  MapPin,
  MessageCircle,
  HelpCircle,
  CalendarIcon,
  Loader2
} from 'lucide-react';
import { useFarmerAgent, useCreateHelpRequest } from '@/hooks/useAgentAssignments';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const taskTypes = [
  { value: 'visit', label: 'Request Visit', labelKn: 'ಭೇಟಿ ವಿನಂತಿ' },
  { value: 'verify_crop', label: 'Crop Verification', labelKn: 'ಬೆಳೆ ಪರಿಶೀಲನೆ' },
  { value: 'harvest_check', label: 'Harvest Check', labelKn: 'ಕೊಯ್ಲು ಪರಿಶೀಲನೆ' },
  { value: 'transport_assist', label: 'Transport Help', labelKn: 'ಸಾರಿಗೆ ಸಹಾಯ' },
];

export default function MyAgentWidget() {
  const { t, language } = useLanguage();
  const { data: agent, isLoading } = useFarmerAgent();
  const createHelpRequest = useCreateHelpRequest();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [taskType, setTaskType] = useState('');
  const [notes, setNotes] = useState('');
  const [preferredDate, setPreferredDate] = useState<Date>();

  const handleCallAgent = () => {
    if (agent?.agent_phone) {
      window.location.href = `tel:${agent.agent_phone}`;
    }
  };

  const handleWhatsApp = () => {
    if (agent?.agent_phone) {
      const phone = agent.agent_phone.replace(/[^0-9]/g, '');
      const message = encodeURIComponent('Hello, I need help with my farm.');
      window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
    }
  };

  const handleSubmitRequest = () => {
    if (!agent?.agent_id || !taskType) return;

    createHelpRequest.mutate(
      {
        agentId: agent.agent_id,
        taskType,
        notes: notes || undefined,
        dueDate: preferredDate?.toISOString().split('T')[0]
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setTaskType('');
          setNotes('');
          setPreferredDate(undefined);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!agent) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            {language === 'kn' ? 'ನನ್ನ ಏಜೆಂಟ್' : 'My Agent'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {language === 'kn'
              ? 'ನಿಮಗೆ ಇನ್ನೂ ಏಜೆಂಟ್ ನಿಯೋಜಿಸಲಾಗಿಲ್ಲ.'
              : 'No agent assigned to you yet.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          {language === 'kn' ? 'ನನ್ನ ಏಜೆಂಟ್' : 'My Agent'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agent Info */}
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
              {agent.agent_name || (language === 'kn' ? 'ಏಜೆಂಟ್' : 'Agent')}
            </h3>
            {agent.agent_phone && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {agent.agent_phone}
              </p>
            )}
            {(agent.agent_village || agent.agent_district) && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[agent.agent_village, agent.agent_district].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCallAgent}
            disabled={!agent.agent_phone}
          >
            <Phone className="h-4 w-4 mr-1" />
            {language === 'kn' ? 'ಕರೆ ಮಾಡಿ' : 'Call'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleWhatsApp}
            disabled={!agent.agent_phone}
            className="text-green-600 hover:text-green-700"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            WhatsApp
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="ml-auto">
                <HelpCircle className="h-4 w-4 mr-1" />
                {language === 'kn' ? 'ಸಹಾಯ ವಿನಂತಿಸಿ' : 'Request Help'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {language === 'kn' ? 'ಸಹಾಯ ವಿನಂತಿಸಿ' : 'Request Help'}
                </DialogTitle>
                <DialogDescription>
                  {language === 'kn'
                    ? 'ನಿಮ್ಮ ಏಜೆಂಟ್‌ಗೆ ಸಹಾಯ ವಿನಂತಿ ಕಳುಹಿಸಿ'
                    : 'Send a help request to your agent'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>{language === 'kn' ? 'ಸಹಾಯದ ಪ್ರಕಾರ' : 'Type of Help'}</Label>
                  <Select value={taskType} onValueChange={setTaskType}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          language === 'kn' ? 'ಆಯ್ಕೆ ಮಾಡಿ...' : 'Select type...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {taskTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {language === 'kn' ? type.labelKn : type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{language === 'kn' ? 'ಟಿಪ್ಪಣಿಗಳು' : 'Notes'} ({t('common.optional')})</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      language === 'kn'
                        ? 'ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ವಿವರಿಸಿ...'
                        : 'Describe your issue...'
                    }
                    rows={3}
                  />
                </div>

                <div>
                  <Label>
                    {language === 'kn' ? 'ಆದ್ಯತೆಯ ದಿನಾಂಕ' : 'Preferred Date'} ({t('common.optional')})
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !preferredDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {preferredDate
                          ? format(preferredDate, 'PPP')
                          : language === 'kn'
                          ? 'ದಿನಾಂಕ ಆಯ್ಕೆಮಾಡಿ'
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={preferredDate}
                        onSelect={setPreferredDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button
                  onClick={handleSubmitRequest}
                  disabled={!taskType || createHelpRequest.isPending}
                  className="w-full"
                >
                  {createHelpRequest.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {language === 'kn' ? 'ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ...' : 'Sending...'}
                    </>
                  ) : (
                    language === 'kn' ? 'ವಿನಂತಿ ಕಳುಹಿಸಿ' : 'Send Request'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
