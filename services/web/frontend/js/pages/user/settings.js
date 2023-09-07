import '../../marketing'
import ReactDOM from 'react-dom'
import SettingsPageRoot from '../../features/settings/components/root'
import { waitForI18n } from 'react-i18next'

await waitForI18n

const element = document.getElementById('settings-page-root')
if (element) {
  ReactDOM.render(<SettingsPageRoot />, element)
}
