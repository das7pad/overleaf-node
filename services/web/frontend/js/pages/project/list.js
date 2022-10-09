import '../../features/page-timing'
import '../../infrastructure/error-reporter'
import 'jquery'
import 'bootstrap'
import '../../utils/meta'
import '../../features/form-helpers/hydrate-form'
import ReactDOM from 'react-dom'
import ProjectListRoot from '../../features/project-list/components/project-list-root'

const element = document.getElementById('project-list-root')
if (element) {
  ReactDOM.render(<ProjectListRoot />, element)
}
