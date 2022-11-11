import { MatcherRoute } from "../createRouterMatcher"
import { error } from "../handler"

export function callEffectLoader(matchs: MatcherRoute[]) {
  matchs.forEach(async route => {
    if (route.loader) {
      route.loaderData = Promise.resolve(route.loader()).catch(err => {
        error("loader call uncaught exceptions", err)
      })
    }
  })
}
