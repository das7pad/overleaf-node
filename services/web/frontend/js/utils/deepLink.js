export function addDeepNavigation(token) {
  if (window.location.hash.includes(token)) return
  window.location.hash += token
}

export function removeDeepNavigation(token) {
  window.location.hash = window.location.hash.replaceAll(token, '')
}

export function hasDeepNavigation(token) {
  return window.location.hash.includes(token)
}
