import { RouteRecord } from "../createRouteRecord"
import { error } from "../handler"
import { RouterContext } from "../router"

export function callEffectAfter(
  fromRecord: RouteRecord,
  router: RouterContext
) {
  const {
    afterEnter,
    his: { location }
  } = router
  try {
    afterEnter(location.state, fromRecord.state)
  } catch (err) {
    error("afterEnter has a error", err)
  }
}
