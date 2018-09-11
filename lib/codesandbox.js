'use babel'

import { CompositeDisposable } from 'atom'
import path from 'path'

import CodesandboxView from './codesandbox-view'
import { getTree, makeRelativePath, isInsideDirectory, findPackageJson } from './utils'
import { DEFAULT_CONFIG } from './Root'

export default {
  view: null,
  subscriptions: null,

  activate(state) {
    this.view = new CodesandboxView()
    this.subscriptions = new CompositeDisposable(
      atom.commands.add('atom-workspace', {
        'codesandbox:toggle-preview-pane': () => this.togglePreviewPage(),
      })
    )
  },

  deactivate() {
    this.subscriptions.dispose()
    this.view.destroy()
  },

  updateTree(projectRootPath, parentDirectory, filePath) {
    const relativePath = makeRelativePath(parentDirectory, filePath)
    const { files, dependencies } = getTree(parentDirectory, filePath)
    const packageJson = findPackageJson(parentDirectory, projectRootPath)

    if (packageJson) {
      files['/package.json'] = { code: packageJson }
    }

    const tree = {
      entry: relativePath,
      files,
      dependencies,
    }

    console.log('finalTree', tree)
    this.view.root.update(tree)
  },

  togglePreviewPage() {
    atom.workspace.toggle(this.view).then(view => {
      if (view) {
        const filePath = atom.workspace
          .getActiveTextEditor()
          .getBuffer()
          .getUri()

        const projectRootPath = atom.project
          .getDirectories()
          .find(directory => directory.contains(filePath))
          .getPath()
        const parentDirectory = path.dirname(filePath)

        this.updateTree(projectRootPath, parentDirectory, filePath)

        this.fileWatcherDisposable = atom.project.onDidChangeFiles(events => {
          const shouldUpdate = events.some(({ path: changedPath }) =>
            isInsideDirectory(parentDirectory, changedPath)
          )

          if (shouldUpdate) {
            this.updateTree(projectRootPath, parentDirectory, filePath)
          }
        })
      } else {
        this.view.root.update(DEFAULT_CONFIG)
        this.fileWatcherDisposable.dispose()
      }
    })
  },

  serialize() {
    return this.view.serialize()
  },
}
