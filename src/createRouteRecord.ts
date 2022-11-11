import { PathTemp } from "./parseLocation"
import { MatcherRoute } from "./createRouterMatcher"

export type RouteRecord = {
  loc: any
  matchState: MatcherRoute | null | undefined
  state: {
    fullPath: string
    path: string
    redirect: undefined | null | string
    query: Record<string, string>
    params: Record<string, string>
    position: null | any
  }
  matchs: MatcherRoute[]
}

export const EMPTY_RECORD: RouteRecord = {
  loc: null,
  matchState: null,
  state: {
    fullPath: "",
    path: "",
    redirect: null,
    query: {},
    params: {},
    position: null
  },
  matchs: []
}

export function createRouteRecord(pathTemp: PathTemp): RouteRecord {
  const { path, query, params, matchState } = pathTemp
  return {
    loc: pathTemp,
    matchState,
    state: {
      fullPath: "",
      path,
      redirect: matchState && matchState.redirect,
      query,
      params,
      position: null
    },
    matchs: []
  }
}
