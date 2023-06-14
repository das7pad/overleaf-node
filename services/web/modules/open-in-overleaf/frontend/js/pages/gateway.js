import showFakeProgress from '../../../../../frontend/js/utils/loadingScreen'
import getMeta from '../../../../../frontend/js/utils/meta'
import { postJSON } from '../../../../../frontend/js/infrastructure/fetch-json'

function showError(key, msg) {
  document.querySelectorAll('[data-ol-error]').forEach(el => {
    el.hidden = key !== el.getAttribute('data-ol-error')
    if (msg) {
      el.innerText = msg
    }
  })
  document.querySelectorAll('[data-ol-error-container]').forEach(el => {
    el.hidden = false
  })
  document.querySelectorAll('[data-ol-loading-container]').forEach(el => {
    el.parentNode.removeChild(el)
  })
}

function goTo(path) {
  // Replace the navigation history entry with the project dashboard.
  // From there, a back-navigation should go to the 3rd party instead of the
  //  gateway page.
  const url = new URL(window.location.origin)
  url.pathname = path
  window.history.replaceState(null, '', url.href)
  window.location.reload()
}

function submit(body) {
  document.querySelector('[data-ol-loading-container]').hidden = false
  showFakeProgress()
  postJSON('/api/open', { body })
    .then(data => {
      const projectId = data.project_id
      window.sessionStorage.removeItem('openInOverleaf')
      goTo(`/project/${projectId}`)
    })
    .catch(err => {
      if (err.response?.status === 401) {
        goTo('/login')
        return
      }
      showError('server', err.data?.error || err.getUserFacingMessage())
    })
}

function showConfirm(site, body) {
  const loadingEl = document.querySelector('[data-ol-loading-container]')
  loadingEl.hidden = true

  const confirmEl = document.querySelector('[data-ol-confirm-third-party]')
  confirmEl.hidden = false
  confirmEl.querySelector('[data-ol-site]').textContent = site

  // confirm
  confirmEl.querySelector('button').addEventListener('click', () => {
    confirmEl.hidden = true
    loadingEl.hidden = false
    submit(body)
  })

  // reject
  confirmEl.querySelector('a').addEventListener('click', e => {
    e.preventDefault()
    window.sessionStorage.removeItem('openInOverleaf')
    goTo('/project')
  })
}

function main() {
  document.querySelector('main').removeAttribute('ng-cloak')

  let params = getMeta('ol-oio-params') || {}
  if (Object.keys(params).length !== 0) {
    window.sessionStorage.setItem('openInOverleaf', JSON.stringify(params))
  } else {
    const stored = window.sessionStorage.getItem('openInOverleaf')
    if (!stored) {
      showError('missing-data')
      return
    }
    params = JSON.parse(stored)
  }

  const body = new FormData()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        body.append(key, v)
      }
    } else {
      body.append(key, value)
    }
  }

  const referrer = new URL(document.referrer || '/', window.location.origin)
  if (referrer.origin !== window.location.origin) {
    showConfirm(referrer.origin, body)
    return
  }
  submit(body)
}

main()
