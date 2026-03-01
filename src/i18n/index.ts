import { en } from './en';
import { kn as knSource } from './kn';
import { resolveTranslationAlias } from './aliases';

export type Language = 'en' | 'kn';
export type TranslationKeys = typeof en;

const MOJIBAKE_MARKER_RE = /[\u00c2\u00c3\u00e0\u00e2]/;
const KANNADA_CHAR_RE = /[\u0C80-\u0CFF]/gu;
const utf8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;

const CP1252_EXTENDED_TO_BYTE: Record<number, number> = {
  8364: 0x80, // â‚¬
  8218: 0x82, // â€š
  402: 0x83,  // Æ’
  8222: 0x84, // â€ž
  8230: 0x85, // â€¦
  8224: 0x86, // â€ 
  8225: 0x87, // â€¡
  710: 0x88,  // Ë†
  8240: 0x89, // â€°
  352: 0x8a,  // Å 
  8249: 0x8b, // â€¹
  338: 0x8c,  // Å’
  381: 0x8e,  // Å½
  8216: 0x91, // â€˜
  8217: 0x92, // â€™
  8220: 0x93, // â€œ
  8221: 0x94, // â€
  8226: 0x95, // â€¢
  8211: 0x96, // â€“
  8212: 0x97, // â€”
  732: 0x98,  // Ëœ
  8482: 0x99, // â„¢
  353: 0x9a,  // Å¡
  8250: 0x9b, // â€º
  339: 0x9c,  // Å“
  382: 0x9e,  // Å¾
  376: 0x9f,  // Å¸
};

const KN_STRING_OVERRIDES: Record<string, string> = {
  'auth.signOut': 'à²¸à³ˆà²¨à³ à²”à²Ÿà³',
  'nav.dashboard': 'à²¡à³à²¯à²¾à²¶à³â€Œà²¬à³‹à²°à³à²¡à³',
  'nav.myDay': 'à²¨à²¨à³à²¨ à²¦à²¿à²¨',
  'nav.today': 'à²‡à²‚à²¦à³',
  'nav.crops': 'à²¨à²¨à³à²¨ à²¬à³†à²³à³†à²—à²³à³',
  'nav.farmlands': 'à²•à³ƒà²·à²¿à²­à³‚à²®à²¿à²—à²³à³',
  'nav.transport': 'à²¸à²¾à²°à²¿à²—à³†',
  'nav.listings': 'à²ªà²Ÿà³à²Ÿà²¿à²—à²³à³',
  'nav.orders': 'à²†à²°à³à²¡à²°à³â€Œà²—à²³à³',
  'nav.earnings': 'à²†à²¦à²¾à²¯',
  'nav.settings': 'à²¸à³†à²Ÿà³à²Ÿà²¿à²‚à²—à³â€Œà²—à²³à³',
  'nav.notifications': 'à²…à²§à²¿à²¸à³‚à²šà²¨à³†à²—à²³à³',
  'nav.cropDiary': 'à²¬à³†à²³à³† à²¦à²¿à²¨à²šà²°à²¿',
  'nav.logout': 'à²¸à³ˆà²¨à³ à²”à²Ÿà³',
  'nav.browseProducts': 'à²‰à²¤à³à²ªà²¨à³à²¨à²—à²³à²¨à³à²¨à³ à²µà³€à²•à³à²·à²¿à²¸à²¿',
  'nav.myOrders': 'à²¨à²¨à³à²¨ à²†à²°à³à²¡à²°à³â€Œà²—à²³à³',
  'nav.profile': 'à²ªà³à²°à³Šà²«à³ˆà²²à³',
  'nav.availableLoads': 'à²²à²­à³à²¯ à²²à³‹à²¡à³â€Œà²—à²³à³',
  'nav.activeTrips': 'à²¸à²•à³à²°à²¿à²¯ à²ªà³à²°à²¯à²¾à²£à²—à²³à³',
  'nav.completed': 'à²ªà³‚à²°à³à²£à²—à³Šà²‚à²¡à²µà³',
  'nav.myVehicles': 'à²¨à²¨à³à²¨ à²µà²¾à²¹à²¨à²—à²³à³',
  'nav.myTasks': 'à²¨à²¨à³à²¨ à²•à²¾à²°à³à²¯à²—à²³à³',
  'nav.myFarmers': 'à²¨à²¨à³à²¨ à²°à³ˆà²¤à²°à³',
  'nav.farmersAndCrops': 'à²°à³ˆà²¤à²°à³ à²®à²¤à³à²¤à³ à²¬à³†à²³à³†à²—à²³à³',
  'nav.farmers': 'à²°à³ˆà²¤à²°à³',
  'nav.buyers': 'à²–à²°à³€à²¦à²¿à²¦à²¾à²°à²°à³',
  'nav.agents': 'à²à²œà³†à²‚à²Ÿà³â€Œà²—à²³à³',
  'nav.transporters': 'à²¸à²¾à²°à²¿à²—à³†à²¦à²¾à²°à²°à³',
  'nav.allCrops': 'à²Žà²²à³à²²à²¾ à²¬à³†à²³à³†à²—à²³à³',
  'nav.dataHealth': 'à²¡à³‡à²Ÿà²¾ à²†à²°à³‹à²—à³à²¯',
  'nav.aiConsole': 'AI à²•à²¨à³â€Œà²¸à³‹à²²à³',
  'nav.serviceArea': 'à²¸à³‡à²µà²¾ à²ªà³à²°à²¦à³‡à²¶',
  'nav.tickets': 'à²Ÿà²¿à²•à³†à²Ÿà³â€Œà²—à²³à³',
  'nav.pendingUpdates': 'à²¬à²¾à²•à²¿ à²¨à²µà³€à²•à²°à²£à²—à²³à³',
  'nav.mysuruDemo': 'à²®à³ˆà²¸à³‚à²°à³ à²¡à³†à²®à³‹',
  'dashboardShell.subtitle.agent': 'à²•à³à²·à³‡à²¤à³à²° à²•à²¾à²°à³à²¯à²¾à²šà²°à²£à³†à²—à²³à³',
  'dashboardShell.subtitle.logistics': 'à²²à²¾à²œà²¿à²¸à³à²Ÿà²¿à²•à³à²¸à³ à²ªà²¾à²²à³à²¦à²¾à²°',
  'dashboardShell.subtitle.buyer': 'à²®à²¾à²°à³à²•à²Ÿà³à²Ÿà³† à²–à²°à³€à²¦à²¿à²¦à²¾à²°',
  'dashboardShell.subtitle.admin': 'à²¨à²¿à²¯à²‚à²¤à³à²°à²£ à²•à³‡à²‚à²¦à³à²°',
  'settings.profileSettings': 'à²ªà³à²°à³Šà²«à³ˆà²²à³ à²¸à³†à²Ÿà³à²Ÿà²¿à²‚à²—à³â€Œà²—à²³à³',
  'settings.languageLabel': 'Language / à²­à²¾à²·à³†',
  'settings.kannada': 'à²•à²¨à³à²¨à²¡',
  'settings.geographicLocation': 'à²­à³Œà²—à³‹à²³à²¿à²• à²®à²¾à²¹à²¿à²¤à²¿',
  'settings.state': 'à²°à²¾à²œà³à²¯',
  'settings.homeMarket': 'à²®à²¨à³† à²®à²¾à²°à³à²•à²Ÿà³à²Ÿà³†',
  'enum.categories.vegetables': 'à²¤à²°à²•à²¾à²°à²¿à²—à²³à³',
  'enum.categories.fruits': 'à²¹à²£à³à²£à³à²—à²³à³',
  'enum.categories.grains': 'à²§à²¾à²¨à³à²¯à²—à²³à³',
  'enum.categories.pulses': 'à²¬à³‡à²³à³†à²—à²³à³',
  'enum.categories.dairy': 'à²¹à²¾à²²à³ à²‰à²¤à³à²ªà²¨à³à²¨à²—à²³à³',
  'enum.categories.spices': 'à²®à²¸à²¾à²²à³†à²—à²³à³',
  'enum.categories.other': 'à²‡à²¤à²°à³†',
  'enum.area_units.acres': 'à²Žà²•à²°à³†',
  'enum.area_units.hectares': 'à²¹à³†à²•à³à²Ÿà³‡à²°à³',
  'enum.area_units.bigha': 'à²¬à³€à²—à²¾',
  'enum.area_units.guntha': 'à²—à³à²‚à²Ÿà³†',
  'enum.soil_types.alluvial': 'à²…à²²à³à²¯à³‚à²µà²¿à²¯à²²à³ à²®à²£à³à²£à³',
  'enum.soil_types.black': 'à²•à²ªà³à²ªà³ à²®à²£à³à²£à³',
  'enum.soil_types.red': 'à²•à³†à²‚à²ªà³ à²®à²£à³à²£à³',
  'enum.soil_types.laterite': 'à²²à³à²¯à²¾à²Ÿà²°à³ˆà²Ÿà³ à²®à²£à³à²£à³',
  'enum.soil_types.sandy': 'à²®à²°à²³à³ à²®à²£à³à²£à³',
  'enum.soil_types.clay': 'à²šà²¿à²•à³à²•à²£à²¿ à²®à²£à³à²£à³',
  'enum.soil_types.loamy': 'à²®à²¿à²¶à³à²° à²®à²£à³à²£à³',
  'enum.units.piece': 'à²¤à³à²‚à²¡à³',
  'enum.units.dozen': 'à²¡à²œà²¨à³',
  'common.welcome': 'ಸ್ವಾಗತ',
  'common.play': 'ಪ್ಲೇ',
  'common.stop': 'ನಿಲ್ಲಿಸಿ',
  'common.english': 'ಇಂಗ್ಲಿಷ್',
  'common.hindi': 'ಹಿಂದಿ',
  'common.kannada': 'ಕನ್ನಡ',
  'badges.personalized': 'ವೈಯಕ್ತಿಕ',
  'badges.webVerified': 'ಜಾಲ ಪರಿಶೀಲಿತ',
  'errors.languagePreferenceSaveFailed': 'ಭಾಷೆ ಆಯ್ಕೆಯನ್ನು ಉಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ',
  'errors.ai.assistantUnavailable': 'ಈಗ ಉತ್ತರ ಪಡೆಯಲು ಆಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  'errors.ai.recommendationsFailed': 'ಶಿಫಾರಸುಗಳನ್ನು ಪಡೆಯಲು ವಿಫಲವಾಗಿದೆ',
  'errors.audio.playFailed': 'ಆಡಿಯೋ ಪ್ಲೇ ಮಾಡಲು ಆಗಲಿಲ್ಲ',
  'errors.audio.voiceUnavailable': 'ಈ ಉತ್ತರಕ್ಕೆ ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ',
  'errors.audio.textOnlyFallback': 'ಧ್ವನಿ ಉತ್ತರ ಲಭ್ಯವಿಲ್ಲ. ಪಠ್ಯ ಉತ್ತರವನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ.',
  'errors.voice.unsupportedBrowser': 'ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಬೆಂಬಲವಿಲ್ಲ. Chrome ಅಥವಾ Edge ಬಳಸಿ.',
  'errors.voice.couldNotAccessMicrophone': 'ಮೈಕ್ರೋಫೋನ್ ಪ್ರವೇಶಿಸಲು ಆಗಲಿಲ್ಲ. ಅನುಮತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.',
  'errors.voice.microphoneDenied': 'ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಬ್ರೌಸರ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಅನುಮತಿಸಿ.',
  'errors.voice.inputFailed': 'ಧ್ವನಿ ಇನ್‌ಪುಟ್ ದೋಷ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.',
  'toast.aiRecommendationsReady': 'AI ಶಿಫಾರಸುಗಳು ಸಿದ್ಧವಾಗಿವೆ!',
  'farmer.assistant.title': 'ಕೃಷಿ ಮಿತ್ರ',
  'farmer.assistant.subtitle': 'ನಿಮ್ಮ ಕೃಷಿ ಸಹಾಯಕ',
  'farmer.assistant.open': 'ಸಹಾಯಕ ತೆರೆಯಿರಿ',
  'farmer.assistant.changeLanguage': 'ಭಾಷೆ ಬದಲಿಸಿ',
  'farmer.assistant.voiceReply': 'ಧ್ವನಿ ಉತ್ತರ',
  'farmer.assistant.welcome': 'ನಮಸ್ಕಾರ!',
  'farmer.assistant.intro': 'ಬೆಳೆ, ಹವಾಮಾನ, ಮಾರುಕಟ್ಟೆ ಬೆಲೆ, ಕೀಟ, ನೀರಾವರಿ ಮತ್ತು ದಿನನಿತ್ಯ ಕೃಷಿ ನಿರ್ಧಾರಗಳ ಬಗ್ಗೆ ಕೇಳಿ.',
  'farmer.assistant.playVoice': 'ಧ್ವನಿ ಉತ್ತರ ಪ್ಲೇ ಮಾಡಿ',
  'farmer.assistant.startListening': 'ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಪ್ರಾರಂಭಿಸಿ',
  'farmer.assistant.stopListening': 'ಧ್ವನಿ ಇನ್‌ಪುಟ್ ನಿಲ್ಲಿಸಿ',
  'farmer.assistant.listening': 'ಕೇಳುತ್ತಿದೆ...',
  'farmer.assistant.typeOrSpeak': 'ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ...',
  'farmer.assistant.send': 'ಕಳುಹಿಸಿ',
  'farmer.assistant.speakNow': 'ಈಗ ಮಾತನಾಡಿ',
  'farmer.assistant.quickPrompts.seasonCropsLabel': 'ಋತುಬೆಳೆ',
  'farmer.assistant.quickPrompts.seasonCropsMessage': 'ಈ ಋತುವಿನಲ್ಲಿ ಕರ್ನಾಟಕದಲ್ಲಿ ಯಾವ ಬೆಳೆ ಬೆಳೆಸುವುದು ಉತ್ತಮ?',
  'farmer.assistant.quickPrompts.pestControlLabel': 'ಕೀಟ ನಿಯಂತ್ರಣ',
  'farmer.assistant.quickPrompts.pestControlMessage': 'ನನ್ನ ಬೆಳೆಯಲ್ಲಿ ಕೀಟದ ಲಕ್ಷಣಗಳಿವೆ. ಮೊದಲು ಏನು ಪರಿಶೀಲಿಸಬೇಕು?',
  'farmer.assistant.quickPrompts.irrigationLabel': 'ನೀರಾವರಿ',
  'farmer.assistant.quickPrompts.irrigationMessage': 'ಈ ವಾರ ನನ್ನ ಬೆಳೆಗೆ ನೀರಾವರಿ ಯೋಜನೆ ಹೇಗೆ ಮಾಡಬೇಕು?',
  'marketplace.browseMarketplace': 'ಮಾರುಕಟ್ಟೆ ವೀಕ್ಷಿಸಿ',
  'marketplace.browseProducts': 'ಉತ್ಪನ್ನಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
  'marketplace.available': 'ಲಭ್ಯ',
  'marketplace.freshHarvest': 'ತಾಜಾ ಕೊಯ್ಲು',
  'marketplace.comingSoon': 'ಶೀಘ್ರದಲ್ಲೇ',
  'marketplace.activeOrdersLabel': 'ಸಕ್ರಿಯ ಆರ್ಡರ್‌ಗಳು',
  'marketplace.freshHarvestAvailable': 'ತಾಜಾ ಕೊಯ್ಲು ಲಭ್ಯ',
  'marketplace.yourActiveOrders': 'ನಿಮ್ಮ ಸಕ್ರಿಯ ಆರ್ಡರ್‌ಗಳು',
  'marketplace.noProductsFound': 'ಉತ್ಪನ್ನಗಳು ಸಿಗಲಿಲ್ಲ',
  'marketplace.tryDifferentFilters': 'ಬೇರೆ ಹುಡುಕಾಟ ಪದಗಳು ಅಥವಾ ಫಿಲ್ಟರ್‌ಗಳನ್ನು ಪ್ರಯತ್ನಿಸಿ',
  'marketplace.aiStockAdvisor': 'AI ಸ್ಟಾಕ್ ಸಲಹೆಗಾರ',
  'marketplace.stockAdvisorContext': 'ನಿಮ್ಮ ಮಾರುಕಟ್ಟೆ ಪ್ರೊಫೈಲ್ ಮತ್ತು ತಾಜಾ ಇನ್‌ವೆಂಟರಿ ಆಧರಿಸಿ ಈ ವಾರ ಯಾವ ಸ್ಟಾಕ್ ಇಡಬೇಕು ಎಂಬ ಸಲಹೆ ಪಡೆಯಿರಿ.',
  'marketplace.stockAdvisorCta': 'ಯಾವ ಸ್ಟಾಕ್ ಇಡಬೇಕು?',
  'marketplace.stockAdvisorAnalyzing': 'ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...',
  'marketplace.stockAdvisorFallback': 'ಮಾರುಕಟ್ಟೆ ಪ್ರವೃತ್ತಿ ಮತ್ತು ನಿಮ್ಮ ಖರೀದಿದಾರ ಪ್ರೊಫೈಲ್ ಆಧರಿಸಿದ AI ಶಿಫಾರಸುಗಳನ್ನು ಪಡೆಯಿರಿ.',
  'orders.noOrdersYet': 'ನಿಮಗೆ ಇನ್ನೂ ಯಾವುದೇ ಆರ್ಡರ್‌ಗಳು ಬಂದಿಲ್ಲ.',
};

function countMatches(value: string, pattern: RegExp): number {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return (value.match(new RegExp(pattern.source, flags)) ?? []).length;
}

function toCp1252Byte(codePoint: number): number | null {
  if (codePoint >= 0 && codePoint <= 0xff) return codePoint;
  return CP1252_EXTENDED_TO_BYTE[codePoint] ?? null;
}

function decodeUtf8MisreadAsCp1252(value: string): string | null {
  if (!utf8Decoder) return null;

  const bytes: number[] = [];
  for (const char of Array.from(value)) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) return null;
    const byte = toCp1252Byte(codePoint);
    if (byte === null) return null;
    bytes.push(byte);
  }

  try {
    return utf8Decoder.decode(new Uint8Array(bytes));
  } catch {
    return null;
  }
}

function readabilityScore(value: string): number {
  const kannadaChars = countMatches(value, KANNADA_CHAR_RE);
  const mojibakeMarkers = countMatches(value, /[\u00c2\u00c3\u00e0\u00e2]/g);
  const replacements = countMatches(value, /\uFFFD/g);
  return (kannadaChars * 4) - (mojibakeMarkers * 5) - (replacements * 20);
}

function repairMojibakeString(value: string): string {
  if (!MOJIBAKE_MARKER_RE.test(value)) {
    return value;
  }

  let current = value;
  for (let i = 0; i < 2; i++) {
    if (!MOJIBAKE_MARKER_RE.test(current)) break;
    const decoded = decodeUtf8MisreadAsCp1252(current);
    if (!decoded || decoded === current || decoded.includes('\uFFFD')) break;
    if (readabilityScore(decoded) <= readabilityScore(current)) break;
    current = decoded;
  }
  return current;
}

function normalizeTranslationTree<T>(node: T): T {
  if (typeof node === 'string') {
    return repairMojibakeString(node) as T;
  }
  if (Array.isArray(node)) {
    return node.map((item) => normalizeTranslationTree(item)) as T;
  }
  if (node && typeof node === 'object') {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      normalized[key] = normalizeTranslationTree(value);
    }
    return normalized as T;
  }
  return node;
}

function applyStringOverrides<T extends Record<string, unknown>>(base: T, overrides: Record<string, string>): T {
  for (const [path, value] of Object.entries(overrides)) {
    const keys = path.split('.');
    let current: Record<string, unknown> = base;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const next = current[key];
      if (!next || typeof next !== 'object' || Array.isArray(next)) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = repairMojibakeString(value);
  }
  return base;
}

function isUnusableKannadaPlaceholder(value: string): boolean {
  const questionMarks = countMatches(value, /\?/g);
  if (questionMarks < 3) return false;
  if (value.includes('????')) return true;
  const visibleChars = value.replace(/\s/g, '').length || 1;
  return questionMarks / visibleChars >= 0.45;
}

const kn = applyStringOverrides(normalizeTranslationTree(knSource), KN_STRING_OVERRIDES) as TranslationKeys;

const translations: Record<Language, TranslationKeys> = {
  en,
  kn,
};

// Track missing keys in development
const missingKeys = new Set<string>();
const isDevRuntime = Boolean((import.meta as any).env?.DEV);

// Get nested value from object using dot notation
function getNestedValue(obj: Record<string, any>, path: string): string | undefined {
  const keys = path.split('.');
  let current: any = obj;
  
  for (const key of keys) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[key];
  }
  
  return typeof current === 'string' ? current : undefined;
}

/**
 * Log missing translation keys in development
 */
function logMissingKey(key: string, language: Language): void {
  const logKey = `${language}:${key}`;
  if (!missingKeys.has(logKey) && isDevRuntime) {
    missingKeys.add(logKey);
    console.warn(`[i18n] Missing ${language.toUpperCase()} key: "${key}"`);
  }
}

/**
 * Check for missing keys between languages (dev helper)
 */
export function validateTranslations(): { missing: string[]; extra: string[] } {
  const enKeys = new Set<string>();
  const knKeys = new Set<string>();
  
  function collectKeys(obj: Record<string, any>, prefix: string, set: Set<string>) {
    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        collectKeys(obj[key], fullKey, set);
      } else {
        set.add(fullKey);
      }
    }
  }
  
  collectKeys(en, '', enKeys);
  collectKeys(kn, '', knKeys);
  
  const missing = [...enKeys].filter(k => !knKeys.has(k));
  const extra = [...knKeys].filter(k => !enKeys.has(k));
  
  if (isDevRuntime && (missing.length > 0 || extra.length > 0)) {
    if (missing.length > 0) {
      console.warn('[i18n] Missing Kannada translations:', missing);
    }
    if (extra.length > 0) {
      console.warn('[i18n] Extra Kannada keys (not in English):', extra);
    }
  }
  
  return { missing, extra };
}

/**
 * Get translation for a key
 * Falls back to English if key not found in current language
 * Falls back to the key itself if not found in English either
 */
export function t(key: string, language: Language = 'en'): string {
  const translation = getNestedValue(translations[language], key);
  
  if (translation !== undefined && !(language === 'kn' && isUnusableKannadaPlaceholder(translation))) {
    return translation;
  }

  const aliasedKey = resolveTranslationAlias(key);
  if (aliasedKey && aliasedKey !== key) {
    const aliasedTranslation = getNestedValue(translations[language], aliasedKey);
    if (aliasedTranslation !== undefined && !(language === 'kn' && isUnusableKannadaPlaceholder(aliasedTranslation))) {
      return aliasedTranslation;
    }
  }
  
  // Log missing key
  logMissingKey(key, language);
  
  // Fallback to English
  if (language !== 'en') {
    const fallback = getNestedValue(translations.en, key);
    if (fallback !== undefined) {
      return fallback;
    }

    if (aliasedKey && aliasedKey !== key) {
      const aliasedFallback = getNestedValue(translations.en, aliasedKey);
      if (aliasedFallback !== undefined) {
        return aliasedFallback;
      }
    }
  }
  
  // Return key as last resort (never blank)
  return key.split('.').pop() || key;
}

export { en, kn };
