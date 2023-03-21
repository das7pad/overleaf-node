/* eslint-disable
    max-len,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import './features/page-timing'
import './main/token-access'
import './main/event'
import './main/system-messages'
import './main/keys'
import './directives/autoSubmitForm'
import './directives/asyncForm'
import './directives/stopPropagation'
import './directives/focus'
import './directives/equals'
import './directives/eventTracking'
import './directives/onEnter'
import './directives/selectAll'
import './directives/maxHeight'
import './directives/bookmarkableTabset'
import './filters/formatDate'
angular.module('SharelatexApp').config(function ($locationProvider) {
  try {
    return $locationProvider.html5Mode({
      enabled: true,
      requireBase: false,
      rewriteLinks: false,
    })
  } catch (e) {
    return console.error("Error while trying to fix '#' links: ", e)
  }
})
export default angular.bootstrap(document.body, ['SharelatexApp'])
