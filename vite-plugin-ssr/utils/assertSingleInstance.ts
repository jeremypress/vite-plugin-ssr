export { onClientEntry_ServerRouting }
export { onClientEntry_ClientRouting }
export { onProjectInfo }

//  - Throw error if there are two different versions of vite-plugin-ssr loaded
//  - Show warning if entry of Client Routing and entry of Server Routing are both loaded
//  - Show warning if vite-plugin-ssr is loaded twice

import { unique } from './unique'
import { getGlobalObject } from './getGlobalObject'
/* Use original assertUsage() & assertWarning() after all CJS is removed from node_modules/vite-plugin-ssr/dist/
import { assertUsage, assertWarning } from './assert'
*/
const globalObject = getGlobalObject<{
  instances: string[]
  checkSingleInstance?: true
  isClientRouting?: boolean
  // For assertWarning() shim
  alreadyLogged: Set<string>
}>('assertPackageInstances.ts', {
  instances: [],
  alreadyLogged: new Set()
})
const makeSure = "Make sure your client-side code doesn't include(/bundle)" as const
const clientEntryClonflict =
  `The client runtime of Server Routing and the client runtime of Client Routing are both being loaded. ${makeSure} both for a given page.` as const
const clientNotSingleInstance =
  `Two vite-plugin-ssr client runtime instances are being loaded. ${makeSure} vite-plugin-ssr twice. (In order to reduce the size of your client-side JavaScript bundles.)` as const

function assertSingleInstance() {
  {
    const versions = unique(globalObject.instances)
    if (versions.length > 1) {
      const errMsg = `Both vite-plugin-ssr@${versions[0]} and vite-plugin-ssr@${versions[1]} loaded. Only one version should be loaded.`
      /*/
      console.warn(errMsg)
      /*/
      assertUsage(false, errMsg)
      //*/
    }
  }

  if (globalObject.checkSingleInstance && globalObject.instances.length > 1) {
    /*/ Not sure whether circular dependency can cause problems? In principle not since client-side code is ESM.
    console.warn(clientNotSingleInstance)
    /*/
    assertWarning(false, clientNotSingleInstance, { onlyOnce: true, showStackTrace: true })
    //*/
  }
}

function onClientEntry_ServerRouting(isProduction: boolean) {
  assertWarning(globalObject.isClientRouting !== true, clientEntryClonflict, { onlyOnce: true, showStackTrace: true })
  assertWarning(globalObject.isClientRouting === undefined, clientNotSingleInstance, {
    onlyOnce: true,
    showStackTrace: true
  })
  globalObject.isClientRouting = false
  if (isProduction) globalObject.checkSingleInstance = true
  assertSingleInstance()
}
function onClientEntry_ClientRouting(isProduction: boolean) {
  assertWarning(globalObject.isClientRouting !== false, clientEntryClonflict, { onlyOnce: true, showStackTrace: true })
  assertWarning(globalObject.isClientRouting === undefined, clientNotSingleInstance, {
    onlyOnce: true,
    showStackTrace: true
  })
  globalObject.isClientRouting = true
  if (isProduction) globalObject.checkSingleInstance = true
  assertSingleInstance()
}

// Called by utils/projectInfo.ts which is loaded by all entries (since utils/asserts.ts depends on utils/projectInfo.ts, we can have confidence that onProjectInfo() is called by each entry). That way we don't have to call a callback for every entry (there are a *lot* of entries: `client/router/`, `client/`, `node/runtime/`, `node/plugin/`, `node/cli`).
function onProjectInfo(projectVersion: string) {
  globalObject.instances.push(projectVersion)
  assertSingleInstance()
}

function assertUsage(condition: unknown, errorMessage: string): asserts condition {
  if (condition) {
    return
  }
  const errMsg = `[vite-plugin-ssr][Wrong Usage] ${errorMessage}`
  throw new Error(errMsg)
}
function assertWarning(
  condition: unknown,
  errorMessage: string,
  { onlyOnce, showStackTrace }: { onlyOnce: boolean | string; showStackTrace: boolean }
): void {
  if (condition) {
    return
  }
  const msg = `[vite-plugin-ssr][Warning] ${errorMessage}`
  if (onlyOnce) {
    const { alreadyLogged } = globalObject
    const key = onlyOnce === true ? msg : onlyOnce
    if (alreadyLogged.has(key)) {
      return
    } else {
      alreadyLogged.add(key)
    }
  }
  if (showStackTrace) {
    console.warn(new Error(msg))
  } else {
    console.warn(msg)
  }
}
