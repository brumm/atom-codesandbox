'use babel'

import fs from 'fs'
import cabinet from 'filing-cabinet'
import precinct from 'precinct'
import path from 'path'

const semverRegex = /([a-z-]+)@v?((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?)\b/i

export const makeRelativePath = (parentDirectory, filePath) =>
  `/${path.relative(parentDirectory, filePath)}`

export const getTree = (parentDirectory, filePath) => {
  // console.group(`getTree ${filePath}`)

  const relativePath = makeRelativePath(parentDirectory, filePath)
  const result = {
    files: {},
    dependencies: {},
  }

  const code = fs.readFileSync(filePath, 'utf8')
  result.files[relativePath] = { code }
  const fileDependencies = precinct(code)
  // console.log('found dependencies', fileDependencies)

  for (let dependency of fileDependencies) {
    // console.log('dependency', dependency)

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
      // console.log('recursing', resolvedDependencyPath)
      const { files, dependencies } = getTree(parentDirectory, resolvedDependencyPath)

      result.files = {
        ...result.files,
        ...files,
      }
      result.dependencies = {
        ...result.dependencies,
        ...dependencies,
      }
    } else {
      // this is a scoped import (import 'lodash/debounce')
      // _not_ scoped package (import '@org/packagename'),
      // we just need the toplevel dependency name
      if (dependency.match(/\//) && !dependency.startsWith('@')) {
        const [topLevel] = dependency.split('/')
        // console.log('truncating deep dependency from', dependency, 'to', topLevel)
        dependency = topLevel
      }

      const match = dependency.match(semverRegex)
      if (match) {
        // bla
        const [name, version] = match.slice(1)
        result.dependencies[name] = version
        result.files[relativePath].code = result.files[relativePath].code.replace(`@${version}`, '')
      } else {
        // this is an npm dependency, add to `dependencies`
        result.dependencies[dependency] = 'latest'
      }
    }
  }

  // console.groupEnd(`getTree ${filePath}`)
  return result
}
