const Path = require('path')
const { buildTestBundleForNode } = require('../../esbuild/buildCI')
const ENTRYPOINT = Path.join(__dirname, 'entrypoint.js')

;(async function () {
  let bundlePath
  try {
    bundlePath = await buildTestBundleForNode(ENTRYPOINT)
  } catch (err) {
    // eslint-disable-next-line mocha/no-identical-title
    describe('esbuild', function () {
      it('should build a bundle', function (done) {
        done(err)
      })
    })

    // Let mocha run the fail-mode test suite with proper reporting to jUnit.
    // NOTE: `run` is a global provided by mocha when started with --delay
    run()
    return
  }

  try {
    // Load JSDOM to mock the DOM in Node.
    // Set pretendToBeVisual to enable requestAnimationFrame
    // NOTE: It does not work when bundled with esbuild due to require.resolve
    //        usage with relative paths.
    require('jsdom-global')(undefined, {
      pretendToBeVisual: true,
      url: 'https://www.test-overleaf.com',
    })

    // Load the bundle which in turn registers all the mocha test suites
    require(bundlePath)

    // Run the test suites
    // NOTE: `run` is a global provided by mocha when started with --delay
    run()
  } catch (err) {
    // eslint-disable-next-line mocha/no-identical-title
    describe('esbuild', function () {
      it('should build a bundle', function (done) {
        done()
      })
      it('should run the bundle', function (done) {
        done(err)
      })
    })

    // Let mocha run the fail-mode test suite with proper reporting to jUnit.
    // NOTE: `run` is a global provided by mocha when started with --delay
    run()
  }
})()
