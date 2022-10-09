import getMeta from '../utils/meta'

const appName = getMeta('ol-appName')
export function t(key: string, vars?: Record<any, any>) {
  vars = vars || {}
  vars.appName = appName
  // @ts-ignore
  return window.t(key, vars)
}
export default t
