import t from '../../infrastructure/t'

export { Trans } from './trans'

export function useTranslation() {
  return { ready: true, t }
}
