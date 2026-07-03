import polyglotI18nProvider from 'ra-i18n-polyglot';
import { viMessages } from './vi-messages.js';

// Single-locale provider (Vietnamese). ra-language-vietnamese is community-maintained and
// version-risky, so we ship a minimal in-repo dictionary instead (see vi-messages.js).
// allowMissing lets us pass already-Vietnamese literals to notify() (e.g. inline status
// toasts) without polyglot warning about a "missing translation key".
export const i18nProvider = polyglotI18nProvider(
  () => viMessages,
  'vi',
  [{ locale: 'vi', name: 'Tiếng Việt' }],
  { allowMissing: true },
);
