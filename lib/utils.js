'use babel'

import cabinet from 'filing-cabinet'
import precinct from 'precinct'
import readPkgUp from 'read-pkg-up'

import fs from 'fs'
import path from 'path'

export const isInsideDirectory = (rootPath, pathToCheck) => {
  const relative = path.relative(rootPath, pathToCheck)
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

export const makeRelativePath = (parentDirectory, filePath) =>
  `/${path.relative(parentDirectory, filePath)}`

export const findPackageJson = (cwd, projectRoot) => {
  const { pkg, path: pkgPath } = readPkgUp.sync({ cwd })
  if (pkg && pkgPath && isInsideDirectory(projectRoot, pkgPath)) {
    return JSON.stringify(pkg)
  }
}

export const getTree = (parentDirectory, filePath) => {
  console.group(`getTree ${filePath}`)

  const relativePath = makeRelativePath(parentDirectory, filePath)
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
