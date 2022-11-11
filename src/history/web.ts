import { RouterContext } from '../router'
import { isPlainObject, isString } from '@setsunajs/shared'
import { normalizeSlash } from '../parseRoutePath'
import { excludeQuery, parseLocation } from '../parseLocation'
import {
  createRouteRecord,
  EMPTY_RECORD,
  RouteRecord
} from '../createRouteRecord'
import { callEffectNavigate } from '../effect/callEffectNavigate'
import { error } from '../handler'

export function createWebHistory(router: RouterContext) {
  const state = {
    base: normalizeBase(router.options.base ?? ''),
    location: EMPTY_RECORD
  }

  if (history.state.setsuna_router) {
    const preLocation = history.state.setsuna_router
    state.location = createRouteRecord(parseLocation(preLocation, router))
    state.location.state.position = preLocation.position
  }

  const push = (to: NavigateInfo) => navigate(to, false)
  const replace = (to: NavigateInfo) => navigate(to, true)
  const go = (delta: number) => history.go(delta)
  const back = () => history.go(-1)
  const forward = () => history.go(1)

  function navigate(to: NavigateInfo, replace: boolean) {
    const options = normalizeNavState(to)
    if (!isString(options.path)) {
      return error('path is not a string', options.path)
    }

    if (!options.force && state.location.loc.path === options.path) {
      return
    }

    callEffectNavigate(
      parseLocation(normalizeNavState(options), router),
      router,
      record => {
        router.his.setLocation(record, replace)
      }
    )
  }

  function setLocation(record: RouteRecord, replace: boolean) {
    const { base, path, pathname, search, hash, query } = record.loc
    let href, fullPath
    if (router.type === 'hash') {
      href = base + pathname + search + '/#' + hash + queryString(query)
      fullPath = base + pathname + search + hash
    } else {
      href = base + path + queryString(query) + hash
      fullPath = base + path + hash
    }

    record.state.fullPath = fullPath
    history[replace ? 'replaceState' : 'pushState'](
      { setsuna_router: record.state },
      '',
      href
    )
    state.location = record
  }

  function onPopstateEvent() {
    callEffectNavigate(parseLocation(null, router), router, record => {
      router.his.setLocation(record, true)
    })
  }

  function destroy() {
    window.removeEventListener('popstate', onPopstateEvent)
  }

  window.addEventListener('popstate', onPopstateEvent)

  return {
    get base() {
      return state.base
    },
    get location() {
      return state.location
    },
    navigator: {
      push,
      replace,
      go,
      back,
      forward
    },
    setLocation,
    destroy
  }
}

export type NavigateInfo = string | NavigateState
export type NavigateState = {
  path: string
  query: Record<string, string>
  force: boolean
}
export function normalizeNavState(info: NavigateInfo): NavigateState {
  if (isString(info)) {
    return {
      path: info,
      query: {},
      force: false
    }
  } else {
    return {
      path: info.path,
      query: isPlainObject(info.query) ? info.query : {},
      force: !!info.force
    }
  }
}

function normalizeBase(basePath: string) {
  let base = basePath ? String(basePath) : ''
  base = base.replace(/^\w+:\/+/, '').replace(/\/?#/, '')
  base = excludeQuery(base)
  base = normalizeSlash(base)

  if (base === '/') {
    base = ''
  }

  return {
    value: base,
    reg: new RegExp(`(^${base}$)|(^${base}/[\\s\\S]+)`)
  }
}

function queryString(query: Record<string, string>) {
  let tokens: string[] = []
  Object.entries(query).forEach(([key, value]) => {
    let exp = ''
    if (key) {
      exp = key
    }
    if (value) {
      exp += '=' + value
    }
    if (exp.length > 0) {
      tokens.push(exp)
    }
  })
  return (tokens.length > 0 ? '?' : '') + tokens.join('&')
}
