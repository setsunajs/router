import {
  createBrowserRouter as _createBrowserRouter,
  RouterAfterEnter,
  RouterBeforeEnter,
  RouteRecord,
  RouterScrollBehavior,
  useRouter
} from "./router"
import { createObservable } from "@setsunajs/observable"
import {
  nextTick,
  useComputed,
  useContext,
  useEffect,
  useMount,
  useProvide,
  useState,
  jsx,
  VNode,
  FC
} from "setsunajs"
import { isFunction } from "@setsunajs/shared"
import { error } from "./handler"

const INJECT_ROUTE_VIEW = "setsuna route view"
const INJECT_ROUTE_ORDER = "setsuna route order"

export * from "./router"

export function useRoute() {
  const order = useContext(INJECT_ROUTE_ORDER)
  return useComputed<RouteRecord["state"]>([order], () => useRouter().his.location.state)[0]
}

export function useLoaderData<T>() {
  const views = useContext(INJECT_ROUTE_VIEW)
  const order = useContext(INJECT_ROUTE_ORDER)
  const [data, setData] = useState<
    undefined | (T extends Promise<any> ? Awaited<T> : T)
  >(undefined)
  let unmounted = false

  useMount(() => {
    return () => (unmounted = true)
  })

  const route = views()[order() - 1]
  if (route) {
    route.loaderData.then((data: any) => {
      if (!unmounted) setData(data)
    })
  }

  return data
}

export function useRouterView() {
  const views = useContext(INJECT_ROUTE_VIEW)
  const order = useContext(INJECT_ROUTE_ORDER)
  const [_, setOrder] = useProvide(INJECT_ROUTE_ORDER, order() + 1)
  const [component, setComponent] = useState(
    (() => {
      const route = views()[order()]
      return route ? route.options.element : null
    })()
  )

  useEffect([views, order], () => {
    const route = views()[order()]
    setComponent(route ? route.options.element : null)
    setOrder(order() + 1)
  })

  return component
}

export const RouterView: FC<{}> = () => {
  const component = useRouterView()
  return () => component()
}

export const Lazy: FC<{ load: () => Promise<any> }> = ({ load }) => {
  if (!isFunction(load)) {
    throw "Lazy component: parameter 'load' is not a legal function "
  }

  const [component, setComponent] = useState<null | VNode>(null)
  load().then(
    res => {
      if (res.default) {
        return setComponent(jsx(res.default, {}))
      }

      const modules = Object.entries(res)
      for (let index = 0; index < modules.length; index++) {
        const [key, value] = modules[index]
        if (isFunction(value) && /[A-Z]/.test(key[0])) {
          return setComponent(jsx(value, {}))
        }
      }
    },
    err => error("component lazy, loading has a error", err)
  )

  return () => component()
}

export type SeRouterRaw = {
  path: string
  element: JSX.Element
  loader?: () => unknown
  children?: SeRouterRaw[]
}

export type BeforeResolve = RouterBeforeEnter
export type AfterResolve = RouterAfterEnter
export type SeRouterOptions = {
  base?: string
  beforeResolve?: BeforeResolve
  afterResolve?: AfterResolve
  routes: SeRouterRaw[]
  scrollBehavior?: RouterScrollBehavior
}

export function createBrowserRouter(options: SeRouterOptions) {
  const router$ = createObservable()
  const { beforeResolve, afterResolve } = options

  const appRouter = _createBrowserRouter({
    ...options,
    beforeEnter: beforeResolve,
    afterEnter: async (to, from) => {
      try {
        router$.next({ to, from })

        if (isFunction(afterResolve)) {
          nextTick(() => afterResolve(to, from))
        }
      } catch (err) {
        error("afterEnter", "call afterEnter has a error", err)
      }
    }
  })

  return function RouterProvide() {
    const [_, setViews] = useProvide(INJECT_ROUTE_VIEW, appRouter.his.location.matchs)
    useProvide(INJECT_ROUTE_ORDER, 0)
    router$.subscribe(() => setViews(appRouter.his.location.matchs))

    useMount(() => {
      return () => {
        router$.complete()
        appRouter.his.destroy()
      }
    })

    return () => jsx("children", null)
  } as FC<{}>
}
