import { createRouteRecord, RouteRecord } from "../createRouteRecord"
import { isString } from "@setsunajs/shared"
import { parseLocation, PathTemp } from "../parseLocation"
import { normalizeNavState } from "../history/web"
import { callEffectNavigate } from "./callEffectNavigate"
import { RouterContext } from "../router"

export function callEffectEnter(
  pathTemp: PathTemp,
  router: RouterContext
): RouteRecord {
  const { beforeEnter, his } = router
  const record = createRouteRecord(pathTemp)
  if (!record.matchState) {
    throw null
  }

  const { redirect } = record.matchState
  if (redirect) {
    callEffectNavigate(
      parseLocation(normalizeNavState(redirect), router),
      router,
      record => router.his.setLocation(record, true)
    )
    throw null
  }

  const res = beforeEnter(record.state, his.location.state)
  if (isString(res)) {
    return callEffectEnter(
      parseLocation(normalizeNavState(res), router),
      router
    )
  }

  if (res) {
    return record
  }

  throw null
}
