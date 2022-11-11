import { RouterRouteRaw } from './router'
import { parseRoutePath } from './parseRoutePath'
import { isFunction, isPlainObject, isString } from '@setsunajs/shared'
import { error } from './handler'

export type Matcher = Map<string, MatcherRoute>
export type MatcherRoute = {
  path: string
  matchPath: string
  match: RegExp
  loader: any
  loaderData: Promise<any>
  paramKeys: string[]
  redirect?: string
  parent?: MatcherRoute
  children: any[]
  options: any
}
export function createRouterMatcher(routes: RouterRouteRaw[]) {
  const matcher: Matcher = new Map()
  routes.forEach(route => createRouteMatcher({ route, deep: 0, matcher }))
  return {
    resolve: (key: string) => {
      let res = matcher.get(key)
      if (res) {
        return res
      }

      matcher.forEach(s => {
        if (!res && s.match.test(key.slice(1, -1))) {
          res = s
        }
      })
      return res
    },
    resolveRecordMatcher: (record: any) => {
      if (!record.matchState) {
        return []
      }

      const state = matcher.get(record.matchState.matchPath)
      const matchs = []
      let curState = state
      while (curState) {
        matchs.push(curState)
        curState = curState.parent
      }

      return matchs.reverse()
    }
  }
}

type MatcherOptions = {
  route: MatcherRoute | RouterRouteRaw
  deep: number
  matcher: any
  parent?: MatcherRoute
}
export function createRouteMatcher({
  route,
  deep,
  matcher,
  parent
}: MatcherOptions) {
  if (!isPlainObject(route))
    return error('current RouterRoute is invalid', route)

  const { path, redirect, loader, children } = route
  if (!isString(path)) return error('RouterRoute path must be string')

  const [_path, paramKeys] = parseRoutePath(path)
  const _regPath = deep === 0 ? _path : `${parent!.matchPath}${_path}`
  const _route: MatcherRoute = {
    path,
    matchPath: _regPath,
    match: /.*/,
    loader,
    loaderData: Promise.resolve(),
    paramKeys,
    redirect,
    parent,
    children: [],
    options: route
  }

  if (loader && !isFunction(loader)) {
    _route.loader = null
    error('route loader is not a function', loader)
  }

  if (Array.isArray(children)) {
    children.forEach(cRoute =>
      createRouteMatcher({
        route: cRoute,
        deep: deep + 1,
        matcher,
        parent: _route
      })
    )
  }

  const regPath = `^${_regPath}$`
  _route.matchPath = regPath
  _route.match = new RegExp(regPath)

  matcher.set(regPath, _route)
}
