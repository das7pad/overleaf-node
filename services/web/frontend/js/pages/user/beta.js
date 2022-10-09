import '../../marketing'
import ReactDOM from 'react-dom'
import BetaProgramParticipate from '../../features/beta-program/components/beta-program-participate'

const element = document.getElementById('beta-program-participate')
if (element) {
  ReactDOM.render(<BetaProgramParticipate />, element)
}
