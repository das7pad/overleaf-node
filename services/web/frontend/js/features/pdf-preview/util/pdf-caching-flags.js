const hasTextEncoder = typeof TextEncoder !== 'undefined'
if (!hasTextEncoder) {
  console.warn('TextEncoder is not available. Disabling pdf-caching.')
}

const isOpera =
  Array.isArray(navigator.userAgentData?.brands) &&
  navigator.userAgentData.brands.some(b => b.brand === 'Opera')
if (isOpera) {
  console.warn('Browser cache is limited in Opera. Disabling pdf-caching.')
}

function isFlagEnabled(flag, fallback) {
  if (!hasTextEncoder) return false
  if (isOpera) return false
  const search = new URLSearchParams(window.location.search)
  return (search.get(flag) || fallback) === 'enabled'
}

export const cachedUrlLookupEnabled = isFlagEnabled(
  'pdf-caching-cached-url-lookup',
  'enabled'
)
export const prefetchingEnabled = isFlagEnabled('pdf-caching-prefetching')
export const prefetchLargeEnabled = isFlagEnabled('pdf-caching-prefetch-large')
export const enablePdfCaching = isFlagEnabled('pdf-caching-mode', 'enabled')
export const trackPdfDownloadEnabled = isFlagEnabled('track-pdf-download')
