export interface Language {
  code: string;
  label: string;
  nativeLabel: string;
  rtl?: boolean;
  /** One-line auto-suggest prompt shown when a visitor's browser language
   * matches this code and no choice has been made yet. */
  suggestPrompt: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', suggestPrompt: '' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', suggestPrompt: 'Voir en français ?' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', suggestPrompt: 'Auf Deutsch ansehen?' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', suggestPrompt: '¿Ver en español?' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', suggestPrompt: 'Vedere in italiano?' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', suggestPrompt: 'Ver em português?' },
  {
    code: 'nl',
    label: 'Dutch',
    nativeLabel: 'Nederlands',
    suggestPrompt: 'Bekijk in het Nederlands?',
  },
  { code: 'pl', label: 'Polish', nativeLabel: 'Polski', suggestPrompt: 'Zobaczyć po polsku?' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe', suggestPrompt: 'Türkçe görüntüle?' },
  {
    code: 'ar',
    label: 'Arabic',
    nativeLabel: 'العربية',
    rtl: true,
    suggestPrompt: 'عرض بالعربية؟',
  },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', suggestPrompt: 'हिन्दी में देखें?' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', suggestPrompt: '日本語で見ますか？' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', suggestPrompt: '한국어로 보시겠어요?' },
  {
    code: 'zh-CN',
    label: 'Chinese (Simplified)',
    nativeLabel: '简体中文',
    suggestPrompt: '查看简体中文？',
  },
];

export const SOURCE_LANGUAGE_CODE = 'en';
