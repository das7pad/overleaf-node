function replaceHash(hash: string) {
  const u = new URL(window.location.href)
  u.hash = hash
  window.history.replaceState(null, '', u)
}

function add(token: string) {
  if (!window.location.hash.includes(token)) {
    replaceHash(window.location.hash + token)
  }
}

function remove(token: string) {
  replaceHash(window.location.hash.replaceAll(token, ''))
}

function has(token: string): boolean {
  return window.location.hash.includes(token)
}

export function useDeepLink(token: string): [boolean, (v: boolean) => void] {
  return [
    has(token),
    (v: boolean) => {
      if (v) {
        add(token)
      } else {
        remove(token)
      }
    },
  ]
}
