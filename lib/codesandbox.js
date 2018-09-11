'use babel'

import { CompositeDisposable } from 'atom'
import path from 'path'

import CodesandboxView from './codesandbox-view'
import { getTree, makeRelativePath } from './utils'
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

  updateTree(parentDirectory, filePath) {
    const relativePath = makeRelativePath(parentDirectory, filePath)
    const tree = {
      entry: relativePath,
      ...getTree(parentDirectory, filePath),
    }

    console.log({ tree })

    this.view.root.update(tree)
  },

  togglePreviewPage() {
    atom.workspace.toggle(this.view).then(view => {
      if (view) {
        console.log('opened')

        const filePath = atom.workspace
          .getActiveTextEditor()
          .getBuffer()
          .getUri()
        const parentDirectory = path.dirname(filePath)

        this.updateTree(parentDirectory, filePath)

        this.fileWatcherDisposable = atom.project.onDidChangeFiles(events => {
          const shouldUpdate = events.some(({ path: changedPath }) => {
            const relative = path.relative(parentDirectory, changedPath)
            return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative)
          })

          if (shouldUpdate) {
            this.updateTree(parentDirectory, filePath)
          }
        })
      } else {
        console.log('closed')
        this.view.root.update(DEFAULT_CONFIG)
        this.fileWatcherDisposable.dispose()
      }
    })
  },

  serialize() {
    return this.view.serialize()
  },
}
