import getMeta from './meta'

const base = getMeta('ol-staticPath', '').replace(/\/$/, '')

export default function staticPath(path: string) {
  if (path.startsWith('../assets')) {
    return base + path.slice('..'.length)
  }
  return base + path
}
