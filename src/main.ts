import {
  createBrowserRouter as _createBrowserRouter,
  RouterOptions,
  useRouter
} from './router'
import { createObservable } from '@setsunajs/observable'
import {
  nextTick,
  useComputed,
  useContext,
  useEffect,
  useMount,
  useProvide,
  useState,
  jsx,
  VNode
} from 'setsuna'
import { isFunction } from '@setsunajs/shared'
import { error } from './handler'

const INJECT_ROUTE_VIEW = 'setsuna route view'
const INJECT_ROUTE_ORDER = 'setsuna route order'

export * from './router'

export function useRoute() {
  const order = useContext(INJECT_ROUTE_ORDER)
  return useComputed([order], () => useRouter().his.location.state)
}

export function useLoaderData() {
  const views = useContext(INJECT_ROUTE_VIEW)
  const order = useContext(INJECT_ROUTE_ORDER)
  const [data, setData] = useState(undefined)
  let unmounted = false

  useMount(() => {
    return () => (unmounted = true)
  })

  views()[order() - 1].loaderData.then((data: any) => {
    if (!unmounted) {
      setData(isFunction(data) ? () => data : data)
    }
  })

  return data
}

export function useRouterView() {
  const views = useContext(INJECT_ROUTE_VIEW)
  const order = useContext(INJECT_ROUTE_ORDER)
  const [_, setOrder] = useProvide(INJECT_ROUTE_ORDER, order() + 1)
  const [component, setComponent] = useState(() => {
    const route = views()[order()]
    return route ? route.options.component : null
  })

  useEffect([views], () => {
    const route = views()[order()]
    setComponent(route ? route.options.component : null)
    setOrder(order() + 1)
  })

  return component
}

export function RouterView() {
  const component = useRouterView()
  return () => component()
}

export function Lazy({ load }: { load: () => Promise<any> }) {
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
    err => error('component lazy, loading has a error', err)
  )

  return () => component()
}

export type RouterRaw = {
  path: string
  loader?: any
}
export type SeRouterOptions = {
  beforeResolve?: any
  afterResolve?: any
  routes: RouterRaw[]
} & Omit<RouterOptions, 'beforeEnter' | 'afterEnter'>

export function createBrowserRouter(options: SeRouterOptions) {
  const router$ = createObservable()
  const { beforeResolve, afterResolve } = options

  const appRouter = _createBrowserRouter({
    ...options,
    beforeEnter: beforeResolve,
    afterEnter: async (to, from) => {
      try {
        if (isFunction(afterResolve)) {
          await Promise.resolve(afterResolve(to, from))
        }

        router$.next({ to, from })

        if (isFunction(afterResolve)) {
          nextTick(() => afterResolve(to, from))
        }
      } catch (err) {
        error('afterEnter', 'call afterEnter has a error', err)
      }
    }
  })
  const { matchs } = appRouter.his.location

  return function RouterProvide() {
    const [_, setViews] = useProvide(INJECT_ROUTE_VIEW, matchs)
    useProvide(INJECT_ROUTE_ORDER, 0)
    router$.subscribe(({ to }) => setViews(to.matchs))

    useMount(() => {
      return () => {
        router$.complete()
        appRouter.his.destroy()
      }
    })

    return () => jsx('children', null)
  }
}
