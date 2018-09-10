'use babel'

import fs from 'fs'
import cabinet from 'filing-cabinet'
import precinct from 'precinct'
import path from 'path'

export const getTree = (parentDirectory, filePath) => {
  console.group(`getTree ${filePath}`)

  const relativePath = `/${path.relative(parentDirectory, filePath)}`
  const result = {
    files: {},
    dependencies: {},
  }

  const code = fs.readFileSync(filePath, 'utf8')
  result.files[relativePath] = { code }
  const fileDependencies = precinct(code)
  console.log('found dependencies', fileDependencies)

  for (let dependency of fileDependencies) {
    console.log('dependency', dependency)

    let resolved = cabinet({
      partial: dependency,
      directory: parentDirectory,
      filename: filePath,
    })

    if (resolved.match(/node_modules/)) {
      resolved = ''
    }

    if (resolved) {
      console.log('recursing', resolved)
      const { files, dependencies } = getTree(parentDirectory, resolved)
      result.files = {
        ...result.files,
        ...files,
      }
      result.dependencies = {
        ...result.dependencies,
        ...dependencies,
      }
    } else {
      if (dependency.match(/\//) && !dependency.startsWith('@')) {
        const [topLevel] = dependency.split('/')
        console.log('truncating deep dependency from', dependency, 'to', topLevel)
        dependency = topLevel
      }

      result.dependencies[dependency] = 'latest'
    }
  }

  console.groupEnd(`getTree ${filePath}`)
  return result
}
