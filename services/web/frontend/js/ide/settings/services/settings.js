/* eslint-disable
    camelcase,
    max-len,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import App from '../../../base'
import getMeta from '../../../utils/meta'
import { postJSON, putJSON } from '../../../infrastructure/fetch-json'
import { projectJWTPutJSON } from '../../../infrastructure/jwt-fetch-json'

export default App.factory('settings', (ide, eventTracking) => ({
  saveSettings(data) {
    if (!getMeta('ol-user_id')) {
      // we do not persist settings for anonymous users
      return
    }

    const editorConfig = Object.assign({}, ide.$scope.settings, data)
    editorConfig.fontSize = parseInt(String(editorConfig.fontSize), 10)
    return putJSON('/api/user/settings/editor', {
      body: { editorConfig },
    })
  },

  saveProjectSettings(body) {
    let p
    if (body.compiler) {
      p = projectJWTPutJSON(`/project/${ide.project_id}/settings/compiler`, {
        body,
      })
    } else if (body.imageName) {
      p = projectJWTPutJSON(`/project/${ide.project_id}/settings/imageName`, {
        body,
      })
    } else if (body.name || body.name === '') {
      p = postJSON(`/api/project/${ide.project_id}/rename`, {
        body: { newProjectName: body.name },
      })
    } else if (body.rootDocId) {
      p = projectJWTPutJSON(`/project/${ide.project_id}/settings/rootDocId`, {
        body,
      })
    } else if (body.spellCheckLanguage || body.spellCheckLanguage === '') {
      p = projectJWTPutJSON(
        `/project/${ide.project_id}/settings/spellCheckLanguage`,
        { body }
      )
    } else if (body.rootDocId === null) {
      // this is handled as part of deleting the root doc element
      p = Promise.resolve()
    } else {
      throw new Error('unknown project setting')
    }

    return p.finally(() => {
      ide.$scope.$applyAsync(() => {})
    })
  },
}))
