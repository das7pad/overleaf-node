import { useTranslation } from 'react-i18next'
import HelpDocumentation from './help-documentation'
import HelpShowHotkeys from './help-show-hotkeys'

export default function HelpMenu() {
  const { t } = useTranslation()

  return (
    <>
      <h4>{t('help')}</h4>
      <ul className="list-unstyled nav">
        <li>
          <HelpShowHotkeys />
        </li>
        <li>
          <HelpDocumentation />
        </li>
      </ul>
    </>
  )
}
