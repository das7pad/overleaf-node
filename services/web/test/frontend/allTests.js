const glob = require('glob')
const CTX = { cwd: __dirname }

module.exports = function () {
  return {
    code: []
      .concat(glob.sync('../../test/frontend/*/**/*.{js,ts,tsx}', CTX))
      .concat(glob.sync('../../modules/*/test/frontend/**/*.{js,ts,tsx}', CTX))
      .filter(s => !s.includes('.spec.'))
      .map(file => `import '${file}'`)
      .join('\n'),
  }
}
