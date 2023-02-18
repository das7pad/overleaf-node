import t from './t'

export { Trans } from './trans'

export function useTranslation() {
  return { ready: true, t }
}
