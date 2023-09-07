import { init, LOCALES } from './locales'

function getMetaLight(name: string, fallback: string) {
  return (
    document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ||
    fallback
  )
}

function getLocale(key: string, vars: { count?: number }) {
  const locale = LOCALES.get(key) || key
  // regular translation
  if (typeof vars.count === 'undefined') return locale

  // plural translation
  const localePlural = LOCALES.get(key + '_plural')
  //  -> false-positives are unlikely
  //  -> -> fail loud and refuse translating on missing plural locale
  if (!localePlural) return key
  //  -> singular case
  if (vars.count === 1) return locale
  //  -> zero / plural case
  return localePlural
}

const FIELDS = /__(.+?)__/g
const APP_NAME = getMetaLight('ol-appName', 'Overleaf')

export function t(key: string, vars: Record<any, any> = {}) {
  vars.appName = APP_NAME
  return getLocale(key, vars).replace(FIELDS, function (field, label) {
    // fallback to no replacement
    // ('__appName__', 'appName') => vars['appName'] || '__appName__'
    return typeof vars[label] !== 'undefined' ? vars[label] : field
  })
}

export default t

export const waitForI18n = init(
  document.firstElementChild?.getAttribute('lang') || 'en',
  getMetaLight('ol-defaultLang', 'en')
)
