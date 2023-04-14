import { isMainFile } from './editor-files'
import getMeta from '../../../utils/meta'
import { projectJWTPOSTJSON } from '../../../infrastructure/jwt-fetch-json'
import { debounce } from 'lodash'
import { trackPdfDownload } from './metrics'
import { FetchError } from '../../../infrastructure/fetch-json'

const AUTO_COMPILE_MAX_WAIT = 5000
// We add a 2 second debounce to sending user changes to server if they aren't
// collaborating with anyone. This needs to be higher than SINGLE_USER_FLUSH_DELAY, and allow for
// client to server latency, otherwise we compile before the op reaches the server
// and then again on ack.
const AUTO_COMPILE_DEBOUNCE = 2500

export default class DocumentCompiler {
  constructor({
    compilingRef,
    projectTreeVersionRef,
    projectId,
    getPathForDocId,
    setChangedAt,
    setCompiling,
    setData,
    setFirstRenderDone,
    setDeliveryLatencies,
    setError,
    cleanupCompileResult,
    signal,
  }) {
    this.compilingRef = compilingRef
    this.getPathForDocId = getPathForDocId
    this.projectId = projectId
    this.setChangedAt = setChangedAt
    this.setCompiling = setCompiling
    this.setData = setData
    this.setFirstRenderDone = setFirstRenderDone
    this.setDeliveryLatencies = setDeliveryLatencies
    this.setError = setError
    this.cleanupCompileResult = cleanupCompileResult
    this.signal = signal

    this.abortPendingCompile = () => {}
    this.clsiServerId = null
    this.currentDoc = null
    this.projectTreeVersionRef = projectTreeVersionRef
    this.lastCompiledProjectTreeVersion = projectTreeVersionRef.current
    this.timer = 0
    this.defaultOptions = {
      draft: false,
      stopOnFirstError: false,
      compilerName: '',
      imageName: '',
    }

    this.debouncedAutoCompile = debounce(
      () => {
        this.compile({ isAutoCompileOnChange: true })
      },
      AUTO_COMPILE_DEBOUNCE,
      {
        maxWait: AUTO_COMPILE_MAX_WAIT,
      }
    )
  }

  // The main "compile" function.
  // Call this directly to run a compile now, otherwise call debouncedAutoCompile.
  async compile(options = {}) {
    options = { ...this.defaultOptions, ...options }

    if (options.isAutoCompileOnLoad && getMeta('ol-preventCompileOnLoad')) {
      return
    }

    // set "compiling" to true (in the React component's state), and return if it was already true
    const wasCompiling = this.compilingRef.current
    this.setCompiling(true)

    if (wasCompiling) {
      if (options.isAutoCompileOnChange) {
        this.debouncedAutoCompile()
      }
      return
    }

    try {
      // reset values
      this.setChangedAt(0) // TODO: wait for doc:saved?
      this.validationIssues = undefined

      window.dispatchEvent(new CustomEvent('flush-changes')) // TODO: wait for this?

      const t0 = performance.now()

      const currentProjectTreeVersion = this.projectTreeVersionRef.current

      const rootDocId = this.getRootDocOverrideId(options)
      const rootDocPath = options.rootDocPath || this.getPathForDocId(rootDocId)
      localStorage.setItem(`doc.path.${rootDocId}`, rootDocPath)
      const body = {
        autoCompile:
          options.isAutoCompileOnLoad || options.isAutoCompileOnChange,
        check: 'silent', // NOTE: 'error' and 'validate' are possible, but unused
        compiler: options.compilerName,
        draft: options.draft,
        imageName: options.imageName,
        // use incremental compile for all users but revert to a full compile
        // if there was previously a server error or the three version changed.
        incrementalCompilesEnabled:
          currentProjectTreeVersion === this.lastCompiledProjectTreeVersion,
        rootDocId,
        rootDocPath,
        stopOnFirstError: options.stopOnFirstError,
        syncState: String(currentProjectTreeVersion),
      }

      const data = await this.performCompile(body)
      if (data.status === 'success') {
        this.lastCompiledProjectTreeVersion = currentProjectTreeVersion
      }

      const compileTimeClientE2E = Math.ceil(performance.now() - t0)
      const { deliveryLatencies, firstRenderDone } = trackPdfDownload(
        data,
        compileTimeClientE2E,
        t0
      )
      this.setDeliveryLatencies(() => deliveryLatencies)
      this.setFirstRenderDone(() => firstRenderDone)

      // unset the error before it's set again later, so that components are recreated and events are tracked
      this.setError(undefined)

      data.options = options
      if (data.clsiServerId) {
        this.clsiServerId = data.clsiServerId
      }
      this.setData(data)
      return data
    } catch (error) {
      console.error(error)
      this.cleanupCompileResult()
      this.setError(error.info?.statusCode === 429 ? 'rate-limited' : 'error')
    } finally {
      this.setCompiling(false)
    }
  }

  async performCompile(body) {
    if (this.signal.aborted) {
      return {
        status: 'terminated',
      }
    }
    const c = new AbortController()
    function abortPendingCompile() {
      c.abort()
    }
    this.abortPendingCompile = abortPendingCompile
    this.signal.addEventListener('abort', abortPendingCompile)
    try {
      return await projectJWTPOSTJSON(`/project/${this.projectId}/compile`, {
        body,
        signal: c.signal,
        swallowAbortError: false,
      })
    } catch (err) {
      if (
        c.signal.aborted ||
        (err instanceof FetchError && err.cause?.name === 'AbortError')
      ) {
        return {
          status: 'terminated',
        }
      }
      throw err
    } finally {
      this.signal.removeEventListener('abort', abortPendingCompile)
      this.abortPendingCompile = () => {}
    }
  }

  // parse the text of the current doc in the editor
  // if it contains "\documentclass" then use this as the root doc
  getRootDocOverrideId({ rootDocId, isAutoCompileOnLoad }) {
    if (isAutoCompileOnLoad) {
      return rootDocId
    }
    // only override when not in the root doc itself
    if (this.currentDoc.doc_id !== rootDocId) {
      const snapshot = this.currentDoc.getSnapshot()

      if (snapshot && isMainFile(snapshot)) {
        localStorage.setItem(
          `doc.isValidRootDoc.${this.currentDoc.doc_id}`,
          'true'
        )
        return this.currentDoc.doc_id
      } else {
        localStorage.setItem(
          `doc.isValidRootDoc.${this.currentDoc.doc_id}`,
          'false'
        )
      }
    }

    return rootDocId
  }

  // send a request to stop the current compile
  stopCompile() {
    this.abortPendingCompile()
    this.setCompiling(false)
  }

  // send a request to clear the cache
  clearCache() {
    this.abortPendingCompile()
    return projectJWTPOSTJSON(`/project/${this.projectId}/clear-cache`, {
      body: { clsiServerId: this.clsiServerId },
      signal: this.signal,
    }).catch(error => {
      console.error(error)
      this.setError('clear-cache')
    })
  }

  setOption(option, value) {
    this.defaultOptions[option] = value
  }
}
