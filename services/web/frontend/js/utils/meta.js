// integration plan
// ----------------
// - stage 1: ~preserve old window access~
// - stage 2: ~refactor window.data access to getMeta()~
// - stage 3: refactor window access to getMeta()
// - stage 4: delete convertMetaToWindowAttributes()
// ----------------

// cache for parsed values
window.metaAttributesCache = window.metaAttributesCache || new Map()

export default function getMeta(name, fallback, skipCache) {
  if (!skipCache && window.metaAttributesCache.has(name)) {
    return window.metaAttributesCache.get(name)
  }
  const element = document.head.querySelector(`meta[name="${name}"]`)
  if (!element) {
    return fallback
  }
  const plainTextValue = element.content
  let value
  switch (element.dataset.type) {
    case 'boolean':
      // in pug: content=false -> no content field
      // in pug: content=true  -> empty content field
      value = element.hasAttribute('content')
      break
    case 'json':
      if (!plainTextValue) {
        // JSON.parse('') throws
        value = undefined
      } else {
        value = JSON.parse(plainTextValue)
      }
      break
    default:
      value = plainTextValue
  }
  window.metaAttributesCache.set(name, value)
  return value
}

function convertMetaToWindowAttributes() {
  Array.from(document.querySelectorAll('meta[name^="ol-"]'))
    .map(element => element.name)
    // process short labels before long ones:
    // e.g. assign 'sharelatex' before 'sharelatex.templates'
    .sort()
    .forEach(name => {
      _setMeta(name, getMeta(name))
    })
}
convertMetaToWindowAttributes()

function _setMeta(name, value) {
  window.metaAttributesCache.set(name, value)
  window[name.slice('ol-'.length)] = value
}

function convertBulkDataToMeta() {
  const b = getMeta('ol-bootstrapEditor')
  if (!b) return
  const settings = getMeta('ol-publicEditorSettings')
  const project = b.project
  const user = b.user
  user.id = user._id

  _setMeta('ol-allowedImageNames', b.allowedImageNames)
  _setMeta('ol-anonymous', b.anonymous)
  _setMeta('ol-anonymousAccessToken', b.anonymousAccessToken)
  _setMeta('ol-detachRole', b.detachRole)
  _setMeta('ol-dictionaryEditorEnabled', !b.anonymous)
  _setMeta('ol-editorThemes', settings.editorThemes)
  _setMeta('ol-enablePdfCaching', settings.enablePdfCaching)
  _setMeta('ol-isRestrictedTokenMember', b.isRestrictedTokenMember)
  _setMeta('ol-jwtCompile', b.jwtCompile)
  _setMeta('ol-jwtLoggedInUser', b.jwtLoggedInUser)
  _setMeta('ol-jwtSpelling', b.jwtSpelling)
  _setMeta('ol-languages', [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'pt_PT', name: 'Português' },
  ])
  _setMeta('ol-learnedWords', user.learnedWords)
  _setMeta('ol-legacyEditorThemes', [])
  _setMeta('ol-maxDocLength', settings.max_doc_length)
  _setMeta('ol-maxEntitiesPerProject', settings.maxEntitiesPerProject)
  _setMeta('ol-maxUploadSize', settings.maxUploadSize)
  _setMeta('ol-overallThemes', [
    { val: '', name: 'Default' },
    { val: 'light-', name: 'Light' },
  ])
  _setMeta('ol-projectCompiler', project.compiler)
  _setMeta('ol-projectImageName', project.imageName)
  _setMeta('ol-projectName', project.name)
  _setMeta('ol-projectRootDocPath', b.rootDocPath)
  _setMeta('ol-projectRootDoc_id', project.rootDoc_id)
  _setMeta('ol-projectTreeVersion', project.version)
  _setMeta('ol-project_id', project._id)
  _setMeta('ol-systemMessages', b.systemMessages)
  _setMeta('ol-textExtensions', settings.textExtensions)
  _setMeta('ol-useShareJsHash', true)
  _setMeta('ol-user', user)
  _setMeta('ol-userSettings', user.ace)
  _setMeta('ol-validRootDocExtensions', settings.validRootDocExtensions)
  _setMeta('ol-wikiEnabled', settings.wikiEnabled)
  _setMeta('ol-wsRetryHandshake', settings.wsRetryHandshake)
  _setMeta('ol-wsUrl', settings.wsUrl)
}
convertBulkDataToMeta()

function addFakeMeta() {
  _setMeta('ol-hasPassword', true)
  _setMeta('ol-isExternalAuthenticationSystemUsed', false)
  _setMeta('ol-passwordStrengthOptions', {
    length: {
      min: 15,
      max: 72,
    },
  })
  _setMeta('ol-shouldAllowEditingDetails', true)
  _setMeta('ol-ExposedSettings', {
    appName: getMeta('ol-appName'),
    betaEnabled: true,
    emailConfirmationDisabled: getMeta('ol-emailConfirmationDisabled', false),
    hasAffiliationsFeature: false,
    hasLinkedProjectFileFeature: true,
    hasLinkedProjectOutputFileFeature: true,
    hasLinkUrlFeature: true,
    hasSamlBeta: false,
    hasSamlFeature: false,
    isOverleaf: false,
    labsEnabled: false,
    maxEntitiesPerProject: getMeta('ol-maxEntitiesPerProject'),
    maxUploadSize: getMeta('ol-maxUploadSize'),
    recaptchaDisabled: {
      invite: true,
      login: true,
      passwordReset: true,
      register: true,
    },
    siteUrl: getMeta('ol-siteURL'),
    templateLinks: [],
    textExtensions: getMeta('ol-textExtensions'),
    validRootDocExtensions: getMeta('ol-validRootDocExtensions'),
  })
}

addFakeMeta()
