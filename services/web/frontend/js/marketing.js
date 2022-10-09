import './features/page-timing'
import './utils/meta'
import './infrastructure/error-reporter'
import 'jquery'
import 'bootstrap'
import './features/form-helpers/hydrate-form'
import './features/link-helpers/slow-link'
import './features/bookmarkable-tab'
import './features/multi-submit'
import './features/mathjax'

$('[data-ol-lang-selector-tooltip]').tooltip({ trigger: 'hover' })
$('[data-toggle="tooltip"]').tooltip()
