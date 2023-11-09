export const EXT_NAMESPACE = 'okki-i18n'
export const EXT_ID = 'perrysong.okki-i18n'
export const EXT_NAME = 'OKKI i18n'
export const EXT_EDITOR_ID = 'okki-i18n-editor'
export const EXT_REVIEW_ID = 'okki-i18n-review'

export const EXT_LEGACY_NAMESPACE = 'vue-okki-i18n'

export const KEY_REG_DEFAULT = '[\\w\\d\\. \\-\\[\\]\\/:]*?'
export const KEY_REG_ALL = '.*?'

export const QUOTE_SYMBOLS = '\'"`'

export const THROTTLE_DELAY = 800
export const FILEWATCHER_TIMEOUT = 100

export const linkKeyMatcher = /(?:@(?:\.[a-z]+)?:(?:[\w\-_|.]+|\([\w\-_|.]+\)))/g
export const linkKeyPrefixMatcher = /^@(?:\.([a-z]+))?:/
export const bracketsMatcher = /[()]/g
export const linkedKeyModifiers = {
  upper: (str: string) => str.toLocaleUpperCase(),
  lower: (str: string) => str.toLocaleLowerCase(),
} as Record<string, (str: string) => string>

export const DEFAULT_LOCALE_COUNTRY_MAP = {
  en: 'us',
  zh: 'cn',
  de: 'de',
  fr: 'fr',
  ja: 'ja',
  es: 'es',
  vi: 'vn',
  lb: 'lu'
}
