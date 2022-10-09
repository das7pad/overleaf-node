// Control the editor loading screen. We want to show the loading screen until
// both the websocket connection has been established (so that the editor is in
// the correct state) and the translations have been loaded (so we don't see a
// flash of untranslated text).
import getMeta from '../utils/meta'
import { loadCss } from '../utils/loadCss'

const ideCssPromise = loadCss(
  getMeta('ol-ide-css'),
  'Cannot load editor styles.'
)

class LoadingManager {
  constructor($scope) {
    this.$scope = $scope

    const socketPromise = new Promise(resolve => {
      this.resolveSocketPromise = resolve
    })

    Promise.all([socketPromise, ideCssPromise])
      .then(() => {
        this.$scope.$apply(() => {
          this.$scope.state.load_progress = 100
          this.$scope.state.loading = false
        })
      })
      .catch(err => {
        this.$scope.$apply(() => {
          this.$scope.state.error = err.message
        })
      })
  }

  socketLoaded() {
    this.resolveSocketPromise()
  }
}

export default LoadingManager
