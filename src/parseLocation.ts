import { MatcherRoute } from "./createRouterMatcher"
import { parseRoutePath } from "./parseRoutePath"
import { RouterContext } from "./router"

export type PathTemp = {
  base: string
  path: string
  pathname: string
  search: string
  hash: string
  query: Record<string, string>
  params: Record<string, string>
  matchPath: string
  matchState: MatcherRoute | null | undefined
}

type Options = null | { path: string; query: Record<string, string> }
export function parseLocation(pathExp: Options, router: RouterContext) {
  const { type, his, matcher } = router
  const base = his.base
  const loc: PathTemp = {
    base: base.value,
    path: "",
    pathname: "",
    search: "",
    hash: "",
    query: {},
    params: {},
    matchPath: "",
    matchState: null
  }
  const { pathname, search, hash } = location
  let _path = ""

  if (!pathExp) {
    if (type === "hash") {
      loc.pathname = pathname
      loc.search = search
      loc.hash = normalizeHashPath(excludeQuery(hash))
      loc.query = parseQuery(loc.hash)
      _path = loc.hash
    } else {
      loc.pathname = pathname
      loc.search = ""
      loc.hash = hash
      loc.query = parseQuery(search)
      _path = pathname
    }
  } else {
    const { path, query } = pathExp
    if (type === "hash") {
      loc.pathname = pathname
      loc.search = search
      loc.hash = normalizeHashPath(excludeQuery(path))
      loc.query = { ...parseQuery(path), ...query }
      _path = loc.hash
    } else {
      loc.pathname = ""
      loc.search = ""
      loc.hash = ""
      loc.query = { ...parseQuery(path), ...query }
      _path = excludeQuery(path)
    }
  }

  if (base.reg.test(_path)) {
    _path = _path.slice(base.value.length)
  }

  const [matchPath] = parseRoutePath(_path)
  const matchState = matcher.resolve(`^${matchPath}$`)
  if (matchState) {
    const res = _path.match(matchState.match)
    if (res) {
      loc.params = matchState.paramKeys.reduce<Record<string, string>>(
        (params, key, index) => {
          params[key] = decodeURIComponent(res[index + 1])
          return params
        },
        {}
      )
    }
  }

  loc.matchPath = matchPath
  loc.matchState = matchState
  loc.path = _path
  return loc
}

export function excludeQuery(path: string) {
  return path.includes("?") ? path.slice(0, path.indexOf("?")) : path
}

export function normalizeHashPath(hash: string) {
  hash = hash.slice(1)
  return hash.startsWith("/") ? hash : `/${hash}`
}

export function parseQuery(path: string) {
  const anchor = path.indexOf("?")
  if (anchor === -1) return {}

  path = path.slice(anchor + 1)
  return path.split("&").reduce<Record<string, string>>((query, str) => {
    const [key, value] = str.split("=")
    if (key) {
      query[decodeURIComponent(key)] = value ? decodeURIComponent(value) : ""
    }

    return query
  }, {})
}
