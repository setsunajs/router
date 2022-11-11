import { isArray } from "@setsunajs/shared"
import { isFunction, BROWSER } from "@setsunajs/shared"
import { createRouterMatcher } from "./createRouterMatcher"
import { callEffectNavigate } from "./effect/callEffectNavigate"
import { createWebHistory, NavigateInfo } from "./history/web"
import { createMemoryHistory } from "./history/memory"
import { RouteRecord } from "./createRouteRecord"

export function createBrowserRouter(options: RouterOptions) {
  return createRouter("history", options, createWebHistory)
}

export function createHashRouter(options: RouterOptions) {
  return createRouter("hash", options, createWebHistory)
}

export function createMemoryRouter(options: RouterOptions) {
  return createRouter("memory", options, createMemoryHistory)
}

export type RouterType = "history" | "hash" | "memory"
export type RouterBeforeEnter = (
  to: RouteRecord["state"],
  from: RouteRecord["state"]
) =>
  | NavigateInfo
  | Promise<NavigateInfo>
  | Promise<boolean>
  | boolean
  | undefined
export type RouterAfterEnter = (
  to: RouteRecord["state"],
  from: RouteRecord["state"]
) => unknown
export type RouterScrollBehavior = (
  to: RouteRecord["state"],
  from: RouteRecord["state"],
  pos: ScrollToOptions
) => ScrollToOptions | null
export type RouterRouteRaw = {
  path: string
  redirect?: string
  loader: () => unknown
  children?: RouterRouteRaw[]
}
export interface RouterOptions {
  base?: string
  routes: any[]
  beforeEnter?: RouterBeforeEnter
  afterEnter?: RouterAfterEnter
  scrollBehavior?: any
  [key: string]: any
}
export type RouterContext = {
  type: RouterType
  beforeEnter: RouterBeforeEnter
  afterEnter: RouterAfterEnter
  scrollBehavior: RouterScrollBehavior
  routes: RouterRouteRaw[]
  his: ReturnType<typeof createWebHistory>
  matcher: ReturnType<typeof createRouterMatcher>
  options: RouterOptions
}

const DEFAULT_GUARD = () => true
let global_router: RouterContext | null = null

export function createRouter(
  type: RouterType,
  options: RouterOptions,
  createHistory: typeof createWebHistory | typeof createMemoryHistory
) {
  if (global_router) {
    return global_router
  }

  const { beforeEnter, afterEnter, routes, scrollBehavior } = options
  if (!isArray(routes)) {
    throw "router-routes must be a array"
  }

  if (BROWSER && scrollBehavior) {
    history.scrollRestoration = "manual"
  }

  const router: RouterContext = {
    type,
    routes,
    beforeEnter: isFunction(beforeEnter) ? beforeEnter : DEFAULT_GUARD,
    afterEnter: isFunction(afterEnter) ? afterEnter : DEFAULT_GUARD,
    scrollBehavior: isFunction(scrollBehavior) ? scrollBehavior : null,
    matcher: createRouterMatcher(routes),
    his: null as any,
    options
  }

  createHistory(router)
  callEffectNavigate(router.his.location.loc, router, (record: RouteRecord) => {
    router.his.setLocation(record, true)
  })

  return (global_router = router)
}

export function useRouter() {
  return global_router!
}

export function useNavigate() {
  return global_router!.his.navigator
}
