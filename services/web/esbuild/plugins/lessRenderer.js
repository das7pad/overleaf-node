/**
 Originally based on esbuild-plugin-less
 @url https://github.com/iam-medvedev/esbuild-plugin-less/blob/d8f5669467238d71bd9e068ac4f9d5d4fcc71cd4/src/index.ts
 @license WTFPL License
 @copyright 2021 Ilya Medvedev <ilya@medvedev.im>
 */

const fs = require('fs')
const Path = require('path')
const less = require('less')

async function renderLess(entrypointPath) {
  const dir = Path.dirname(entrypointPath)
  const blob = await fs.promises.readFile(entrypointPath, 'utf-8')

  const lessOpts = {
    // Emit relative paths from here.
    filename: entrypointPath,

    // Resolve URL imports per file and emit relative paths from entrypoint.
    rewriteUrls: 'all',

    // Resolve all the math expressions
    math: 'always',

    // Search imports in here.
    paths: [dir],

    sourceMap: { sourceMapFileInline: true },
  }

  let result
  try {
    result = await less.render(blob, lessOpts)
  } catch (error) {
    const message = convertLessError(error)
    return {
      errors: [message],
      resolveDir: dir,
      warnings: [],
      // Wait for a fix in the file with errors.
      watchFiles: [message.location.file],
    }
  }

  const { css: bundleContents, imports } = result

  // Watch for changes in all the less files.
  const watchFiles = imports.concat([entrypointPath])

  return {
    contents: bundleContents,
    resolveDir: dir,
    warnings: [],
    watchFiles,
  }
}

function convertLessError(error) {
  // error.extract = [lineTextBeforeError, lineText, lineTextAfterError]
  // NOTE: lineTextBeforeError and lineTextAfterError may be null.
  const [, lineText] = error.extract

  return {
    text: error.message,
    location: {
      namespace: 'file',
      file: error.filename,
      line: error.line,
      column: error.column,
      lineText,
    },
  }
}

;(async function main() {
  console.log(JSON.stringify(await renderLess(process.argv.pop())))
})()
