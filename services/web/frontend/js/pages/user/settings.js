import '../../marketing'
import ReactDOM from 'react-dom'
import SettingsPageRoot from '../../features/settings/components/root'

const element = document.getElementById('settings-page-root')
if (element) {
  ReactDOM.render(<SettingsPageRoot />, element)
}
