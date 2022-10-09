import getMeta from '../utils/meta'
import {
  deleteJSON,
  getJSON,
  postJSON,
  putJSON,
  FetchConfig,
} from './fetch-json'

type JWTFetchJSONOptions = {
  name: string
  url: string
  options?: FetchConfig
  refreshEndpoint: string
}

type JWTFetchJSONOptionsWithFetchJSONFn<T> = JWTFetchJSONOptions & {
  fn: (path: string, options: FetchConfig) => Promise<T>
}
type JWTFetchJSONOptionsWithJWTFetchJSONFn<T> = JWTFetchJSONOptions & {
  fn: (options: JWTFetchJSONOptions) => Promise<T>
}

export const jwtUrlWeb = '/jwt/web'

export const JWTs = new Map()
const pendingJWTRefresh = new Map()

export function isExpired(jwt: string) {
  return JSON.parse(window.atob(jwt.split('.')[1])).exp * 1000 < Date.now()
}

export function getProjectJWT() {
  return JWTs.get('ol-jwtCompile')
}

export function clearProjectJWT() {
  JWTs.set('ol-jwtCompile', '')
}

export async function refreshProjectJWT() {
  return refresh(
    'ol-jwtCompile',
    `/api/project/${getMeta('ol-project_id')}/jwt`
  )
}

async function getJWT(name: string, refreshEndpoint: string) {
  if (!JWTs.has(name)) {
    JWTs.set(name, getMeta(name))
  }
  const jwt = JWTs.get(name)
  if (jwt && !isExpired(jwt)) {
    return jwt
  }
  if (!refreshEndpoint) {
    throw new Error(`missing bootstrap for JWT '${name}'`)
  }
  return refresh(name, refreshEndpoint)
}

async function refresh(name: string, refreshEndpoint: string) {
  if (!pendingJWTRefresh.has(refreshEndpoint)) {
    pendingJWTRefresh.set(refreshEndpoint, getJSON(refreshEndpoint))
  }
  const pending = pendingJWTRefresh.get(refreshEndpoint)
  let jwt
  try {
    jwt = await pending
  } finally {
    if (pendingJWTRefresh.get(refreshEndpoint) === pending) {
      pendingJWTRefresh.delete(refreshEndpoint)
    }
  }
  JWTs.set(name, jwt)
  return jwt
}

async function once<T>({
  name,
  url,
  options,
  refreshEndpoint,
  fn,
}: JWTFetchJSONOptionsWithFetchJSONFn<T>) {
  const jwt = await getJWT(name, refreshEndpoint)
  return fn(jwtUrlWeb + url, {
    ...options,
    headers: { Authorization: 'Bearer ' + jwt },
  })
}

export async function jwtDeleteJSONOnce({
  name,
  url,
  options,
  refreshEndpoint,
}: JWTFetchJSONOptions) {
  return once({
    name,
    url,
    options,
    refreshEndpoint,
    fn: deleteJSON,
  })
}

export async function jwtGetJSONOnce({
  name,
  url,
  options,
  refreshEndpoint,
}: JWTFetchJSONOptions) {
  return once({
    name,
    url,
    options,
    refreshEndpoint,
    fn: getJSON,
  })
}

export async function jwtPostJSONOnce({
  name,
  url,
  options,
  refreshEndpoint,
}: JWTFetchJSONOptions) {
  return once({
    name,
    url,
    options,
    refreshEndpoint,
    fn: postJSON,
  })
}

export async function jwtPutJSONOnce({
  name,
  url,
  options,
  refreshEndpoint,
}: JWTFetchJSONOptions) {
  return once({
    name,
    url,
    options,
    refreshEndpoint,
    fn: putJSON,
  })
}

async function withRetry<T>({
  name,
  url,
  options,
  refreshEndpoint,
  fn,
}: JWTFetchJSONOptionsWithJWTFetchJSONFn<T>) {
  const doOnce = () => fn({ name, url, options, refreshEndpoint })
  try {
    return await doOnce()
  } catch (err: any) {
    const statusCode = err.response?.status
    if (statusCode === 401 && refreshEndpoint) {
      try {
        await refresh(name, refreshEndpoint)
      } catch (e) {
        // Throw original error.
        throw err
      }
      return doOnce()
    }
    throw err
  }
}

export async function jwtDeleteJSON<T>({
  name,
  url,
  options,
  refreshEndpoint,
}: JWTFetchJSONOptions) {
  return withRetry<T>({
    name,
    url,
    options,
    refreshEndpoint,
    fn: jwtDeleteJSONOnce,
  })
}

export async function jwtPostJSON<T>({
  name,
  url,
  options,
  refreshEndpoint,
}: JWTFetchJSONOptions) {
  return withRetry<T>({
    name,
    url,
    options,
    refreshEndpoint,
    fn: jwtPostJSONOnce,
  })
}

export async function jwtPutJSON<T>({
  name,
  url,
  options,
  refreshEndpoint,
}: JWTFetchJSONOptions) {
  return withRetry<T>({
    name,
    url,
    options,
    refreshEndpoint,
    fn: jwtPutJSONOnce,
  })
}

export async function jwtGetJSON<T>({
  name,
  url,
  options,
  refreshEndpoint,
}: JWTFetchJSONOptions) {
  return withRetry<T>({
    name,
    url,
    options,
    refreshEndpoint,
    fn: jwtGetJSONOnce,
  })
}

export async function projectJWTDeleteJSON<T>(
  url: string,
  options?: FetchConfig
) {
  return jwtDeleteJSON<T>({
    name: 'ol-jwtCompile',
    url,
    options,
    refreshEndpoint: `/api/project/${getMeta('ol-project_id')}/jwt`,
  })
}

export async function projectJWTGetJSON<T>(url: string, options?: FetchConfig) {
  return jwtGetJSON<T>({
    name: 'ol-jwtCompile',
    url,
    options,
    refreshEndpoint: `/api/project/${getMeta('ol-project_id')}/jwt`,
  })
}

export async function projectJWTPOSTJSON<T>(
  url: string,
  options?: FetchConfig
) {
  return jwtPostJSON<T>({
    name: 'ol-jwtCompile',
    url,
    options,
    refreshEndpoint: `/api/project/${getMeta('ol-project_id')}/jwt`,
  })
}

export async function projectJWTPutJSON<T>(url: string, options?: FetchConfig) {
  return jwtPutJSON<T>({
    name: 'ol-jwtCompile',
    url,
    options,
    refreshEndpoint: `/api/project/${getMeta('ol-project_id')}/jwt`,
  })
}
