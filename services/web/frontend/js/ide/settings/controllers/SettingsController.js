/* eslint-disable
    camelcase,
    max-len,
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import App from '../../../base'
import isValidTeXFile from '../../../main/is-valid-tex-file'
import getMeta from '../../../utils/meta'

export default App.controller(
  'SettingsController',
  function ($scope, settings, ide) {
    $scope.editorThemes = getMeta('ol-editorThemes').map(t => {
      return { value: t, name: t.replace(/_/g, ' ') }
    })
    $scope.overallThemesList = [
      { value: '', name: 'Default' },
      { value: 'light-', name: 'Light' },
    ]
    $scope.allowedImageNames = getMeta('ol-allowedImageNames')
    $scope.ui = { loadingStyleSheet: false }

    const _updateCSSFile = function (theme) {
      $scope.ui.loadingStyleSheet = true
      const docHeadEl = document.querySelector('head')
      const oldStyleSheetEl = document.getElementById('main-stylesheet')
      const newStyleSheetEl = document.createElement('link')
      newStyleSheetEl.addEventListener('load', e => {
        return $scope.$applyAsync(() => {
          $scope.ui.loadingStyleSheet = false
          return docHeadEl.removeChild(oldStyleSheetEl)
        })
      })
      newStyleSheetEl.setAttribute('rel', 'stylesheet')
      newStyleSheetEl.setAttribute('id', 'main-stylesheet')
      newStyleSheetEl.setAttribute(
        'href',
        theme.value === 'light-'
          ? getMeta('ol-theme-light', '', true)
          : getMeta('ol-theme-default', '', true)
      )
      return docHeadEl.appendChild(newStyleSheetEl)
    }

    if (!['default', 'vim', 'emacs'].includes($scope.settings.mode)) {
      $scope.settings.mode = 'default'
    }

    if (!['pdfjs', 'native'].includes($scope.settings.pdfViewer)) {
      $scope.settings.pdfViewer = 'pdfjs'
    }

    if (
      !$scope.settings.fontFamily ||
      !['monaco', 'lucida'].includes($scope.settings.fontFamily)
    ) {
      $scope.settings.fontFamily = 'lucida'
    }

    if (
      !$scope.settings.lineHeight ||
      !['compact', 'normal', 'wide'].includes($scope.settings.lineHeight)
    ) {
      $scope.settings.lineHeight = 'normal'
    }

    $scope.fontSizeAsStr = function (newVal) {
      if (newVal != null) {
        $scope.settings.fontSize = newVal
      }
      return $scope.settings.fontSize.toString()
    }

    $scope.getValidMainDocs = () => {
      let filteredDocs = []
      if ($scope.docs) {
        // Filter the existing docs (editable files) by accepted file extensions.
        // It's possible that an existing project has an invalid file selected as the main one.
        // To gracefully handle that case, make sure we also show the current main file (ignoring extension).
        filteredDocs = $scope.docs.filter(
          doc =>
            isValidTeXFile(doc.doc.name) ||
            $scope.project.rootDoc_id === doc.doc.id
        )
      }
      return filteredDocs
    }

    $scope.$watch('settings.theme', (theme, oldTheme) => {
      if (theme !== oldTheme) {
        return settings.saveSettings({ theme })
      }
    })

    $scope.$watch('settings.overallTheme', (overallTheme, oldOverallTheme) => {
      if (overallTheme !== oldOverallTheme) {
        const chosenTheme = $scope.overallThemesList.find(
          theme => theme.value === overallTheme
        )
        if (chosenTheme != null) {
          document.body.dataset.olThemeModifier = overallTheme
          _updateCSSFile(chosenTheme)
          return settings.saveSettings({ overallTheme })
        }
      }
    })

    $scope.$watch('settings.fontSize', (fontSize, oldFontSize) => {
      if (fontSize !== oldFontSize) {
        return settings.saveSettings({ fontSize: parseInt(fontSize, 10) })
      }
    })

    $scope.$watch('settings.mode', (mode, oldMode) => {
      if (mode !== oldMode) {
        return settings.saveSettings({ mode })
      }
    })

    $scope.$watch('settings.autoComplete', (autoComplete, oldAutoComplete) => {
      if (autoComplete !== oldAutoComplete) {
        return settings.saveSettings({ autoComplete })
      }
    })

    $scope.$watch(
      'settings.autoPairDelimiters',
      (autoPairDelimiters, oldAutoPairDelimiters) => {
        if (autoPairDelimiters !== oldAutoPairDelimiters) {
          return settings.saveSettings({ autoPairDelimiters })
        }
      }
    )

    $scope.$watch('settings.pdfViewer', (pdfViewer, oldPdfViewer) => {
      if (pdfViewer !== oldPdfViewer) {
        return settings.saveSettings({ pdfViewer })
      }
    })

    $scope.$watch(
      'settings.syntaxValidation',
      (syntaxValidation, oldSyntaxValidation) => {
        if (syntaxValidation !== oldSyntaxValidation) {
          return settings.saveSettings({ syntaxValidation })
        }
      }
    )

    $scope.$watch('settings.fontFamily', (fontFamily, oldFontFamily) => {
      if (fontFamily !== oldFontFamily) {
        return settings.saveSettings({ fontFamily })
      }
    })

    $scope.$watch('settings.lineHeight', (lineHeight, oldLineHeight) => {
      if (lineHeight !== oldLineHeight) {
        return settings.saveSettings({ lineHeight })
      }
    })

    $scope.$watch('project.spellCheckLanguage', (language, oldLanguage) => {
      if (this.ignoreUpdates) {
        return
      }
      if (oldLanguage != null && language !== oldLanguage) {
        settings.saveProjectSettings({ spellCheckLanguage: language })
        // Also set it as the default for the user
        return settings.saveSettings({ spellCheckLanguage: language })
      }
    })

    $scope.$watch('project.compiler', (compiler, oldCompiler) => {
      if (this.ignoreUpdates) {
        return
      }
      if (oldCompiler != null && compiler !== oldCompiler) {
        return settings.saveProjectSettings({ compiler })
      }
    })

    $scope.$watch('project.imageName', (imageName, oldImageName) => {
      if (this.ignoreUpdates) {
        return
      }
      if (oldImageName != null && imageName !== oldImageName) {
        return settings.saveProjectSettings({ imageName })
      }
    })

    let rootDocUpdateFailed = 0
    $scope.$watch('project.rootDoc_id', (rootDoc_id, oldRootDoc_id) => {
      if (this.ignoreUpdates) {
        return
      }
      // don't save on initialisation, Angular passes oldRootDoc_id as
      // undefined in this case.
      if (typeof oldRootDoc_id === 'undefined') {
        return
      }
      if ($scope.permissionsLevel === 'readOnly') {
        // The user is unauthorized to persist rootDoc changes.
        // Use the new value for this very editor session only.
        return
      }
      // otherwise only save changes, null values are allowed
      if (rootDoc_id !== oldRootDoc_id) {
        settings
          .saveProjectSettings({ rootDocId: rootDoc_id })
          .then(() => {
            rootDocUpdateFailed = 0
          })
          .catch(() => {
            rootDocUpdateFailed++
            // Let the login redirect run (if any) and reset afterwards.
            setTimeout(() => {
              if (rootDocUpdateFailed > 10) {
                // We are in a loop of failing updates. Stop now.
                this.ignoreUpdates = true
              }
              $scope.$apply(() => {
                $scope.project.rootDoc_id = oldRootDoc_id
              })
              this.ignoreUpdates = false
            })
          })
      }
    })

    ide.socket.on('compilerUpdated', compiler => {
      this.ignoreUpdates = true
      $scope.$apply(() => {
        return ($scope.project.compiler = compiler)
      })
      return delete this.ignoreUpdates
    })

    ide.socket.on('imageNameUpdated', imageName => {
      this.ignoreUpdates = true
      $scope.$apply(() => {
        return ($scope.project.imageName = imageName)
      })
      return delete this.ignoreUpdates
    })

    return ide.socket.on('spellCheckLanguageUpdated', languageCode => {
      this.ignoreUpdates = true
      $scope.$apply(() => {
        return ($scope.project.spellCheckLanguage = languageCode)
      })
      return delete this.ignoreUpdates
    })
  }
)
