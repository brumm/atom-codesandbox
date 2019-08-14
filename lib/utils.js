'use babel'

import fs from 'fs'
import cabinet from 'filing-cabinet'
import precinct from 'precinct'
import path from 'path'

const DEBUG = false
const log = (...args) => DEBUG && console.log(...args)
const group = (...args) => DEBUG && console.group(...args)
const groupEnd = (...args) => DEBUG && console.groupEnd(...args)
const warn = (...args) => DEBUG && console.warn(...args)

export const makeRelativePath = (parentDirectory, filePath) =>
  `/${path.relative(parentDirectory, filePath)}`

export const getTree = (parentDirectory, filePath) => {
  group(`getTree ${filePath}`)

  const relativePath = makeRelativePath(parentDirectory, filePath)
  const result = {
    files: {},
    dependencies: {},
  }

  const code = fs.readFileSync(filePath, 'utf8')
  result.files[relativePath] = { code }
  const fileDependencies = precinct(code)
  log('found dependencies', fileDependencies)

  for (let dependency of fileDependencies) {
    log('dependency', dependency)

    let resolvedDependencyPath = cabinet({
      partial: dependency,
      directory: parentDirectory,
      filename: filePath,
    })

    // we don't provide file content for npm dependencies,
    // they just get added to `dependencies` further below
    if (resolvedDependencyPath.match(/node_modules/)) {
      resolvedDependencyPath = ''
    }

    if (resolvedDependencyPath) {
      // this is a local file, we need to recurse
      log('recursing', resolvedDependencyPath)
      const { files, dependencies } = getTree(
        parentDirectory,
        resolvedDependencyPath
      )

      result.files = {
        ...result.files,
        ...files,
      }
      result.dependencies = {
        ...result.dependencies,
        ...dependencies,
      }
    } else {
      const match = dependency.match(
        /^(@[a-z-_.]+\/[a-z-_.]+|[a-z-_.]+)(@[a-z0-9.-]+)?(\/.*)?$/
      )

      log(match)
      if (match) {
        const matches = match.slice(1).filter(Boolean)

        if (
          matches.length === 3 ||
          (matches.length === 2 && matches[1].startsWith('@'))
        ) {
          let [name, tag] = matches
          result.dependencies[name] = tag.slice(1)
          result.files[relativePath].code = result.files[
            relativePath
          ].code.replace(tag, '')
        } else {
          let [name] = matches
          result.dependencies[name] = 'latest'
        }
      } else {
        // There are dependencies, but we can't parse them.
        warn("[atom-codesandbox] couldn't parse dependency", dependency)
      }
    }
  }

  groupEnd(`getTree ${filePath}`)
  return result
}
