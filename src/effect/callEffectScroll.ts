import { isPlainObject } from "@setsunajs/shared"
import { nextTick } from "setsuna"
import { error } from "../handler"
import { RouteRecord } from "../createRouteRecord"
import { RouterContext } from "../router"

export function callEffectScroll(
  to: RouteRecord,
  from: RouteRecord,
  router: RouterContext
) {
  const { scrollBehavior } = router
  const savedPosition = from.state.position

  try {
    if (!scrollBehavior) return (to.state.position = savedPosition)

    const res = scrollBehavior(to.state, from.state, savedPosition)
    if (!isPlainObject(res)) {
      return error(
        "The return value of `scrollBehavior()` is not a legal return value",
        res
      )
    }

    to.state.position = res
  } catch (err) {
    error("afterEnter has a error", err)
  } finally {
    nextTick(() => {
      try {
        window.scrollTo(to.state.position)
      } catch (_) {}
    })
  }
}
