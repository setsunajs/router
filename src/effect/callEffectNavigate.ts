import { callEffectEnter } from './callEffectEnter'
import { callEffectLoader } from './callEffectLoader'
import { callEffectScroll } from './callEffectScroll'
import { callEffectAfter } from './callEffectAfter'
import { error } from '../handler'
import { RouterContext } from '../router'
import { PathTemp } from '../parseLocation'
import { RouteRecord } from '../createRouteRecord'

export function callEffectNavigate(
  pathTemp: PathTemp,
  router: RouterContext,
  callback: (record: RouteRecord) => unknown
) {
  const { matcher, his } = router
  const { resolveRecordMatcher } = matcher

  try {
    const record = callEffectEnter(pathTemp, router)
    const fromRecord = his.location
    const matchs = resolveRecordMatcher(record)
    record.matchs = matchs

    callEffectLoader(matchs)
    callback(record)
    callEffectAfter(fromRecord, router)
    callEffectScroll(record, fromRecord, router)
  } catch (err) {
    if (err === null) return
    error('router has a uncaught exceptions', err)
  }
}
