import t from './t'

export { waitForI18n } from './t'

export { Trans } from './trans'

export function useTranslation() {
  return { ready: true, t }
}
