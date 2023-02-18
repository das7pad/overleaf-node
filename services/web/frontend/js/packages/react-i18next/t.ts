export function t(key: string, vars?: Record<any, any>) {
  vars = vars || {}
  // @ts-ignore
  vars.appName = window.appName
  // @ts-ignore
  return window.t(key, vars)
}
export default t
