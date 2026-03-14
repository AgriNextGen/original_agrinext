import { Globe, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import type { Language } from '@/i18n';

interface LanguageSelectorProps {
  /** "compact" renders a small icon button (for headers), "inline" renders labeled buttons (for settings) */
  variant?: 'compact' | 'inline';
  className?: string;
}

const LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
];

const LanguageSelector = ({ variant = 'compact', className }: LanguageSelectorProps) => {
  const { language, setLanguage, isLoading, t } = useLanguage();

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center justify-between p-4 bg-muted/30 rounded-lg', className)}>
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{t('settings.language')}</p>
            <p className="text-sm text-muted-foreground">
              {language === 'en' ? t('settings.english') : t('settings.kannada')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {LANGUAGES.map((lang) => (
            <Button
              key={lang.code}
              variant={language === lang.code ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage(lang.code)}
              disabled={isLoading}
            >
              {language === lang.code && <Check className="h-3 w-3 mr-1" />}
              {lang.code === 'en' ? t('settings.english') : t('settings.kannada')}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t('settings.language')}
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setLanguage(lang.code)}
          >
            <span>{lang.nativeLabel}</span>
            {language === lang.code && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
