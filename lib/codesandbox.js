'use babel'

import { CompositeDisposable } from 'atom'
import fs from 'fs'
import path from 'path'
import tempy from 'tempy'

import CodesandboxView from './codesandbox-view'
import { getTree, makeRelativePath } from './utils'
import { DEFAULT_CONFIG } from './Root'

const PROTOCOL = 'cdsbx://'

export default {
  view: null,
  subscriptions: null,

  activate(state) {
    this.view = new CodesandboxView()
    this.subscriptions = new CompositeDisposable(
      atom.workspace.addOpener(uri => {
        if (uri.startsWith(PROTOCOL)) {
          this.togglePreviewPage(uri.replace(PROTOCOL, ''))
          return this.view
        }
      }),
      atom.commands.add('atom-workspace', {
        'codesandbox:toggle-preview-pane': () => {
          const filePath = atom.workspace
            .getActiveTextEditor()
            .getBuffer()
            .getUri()

          this.togglePreviewPage(filePath)
        },
      }),
      atom.commands.add('atom-workspace', {
        'codesandbox:new-scratch-pad': () => this.createNewScratchPad(),
      })
    )
  },

  createNewScratchPad() {
    const tempFile = tempy.file({ name: 'index.js' })
    fs.writeFileSync(tempFile, "console.log('Hello world')", 'utf8')

    atom.workspace.open(tempFile)
    atom.workspace.open(`${PROTOCOL}${tempFile}`)
  },

  deactivate() {
    this.subscriptions.dispose()
    this.view.destroy()
  },

  updateTree(parentDirectory, filePath) {
    const relativePath = makeRelativePath(parentDirectory, filePath)
    const tree = {
      entry: relativePath.slice(1),
      ...getTree(parentDirectory, filePath),
    }

    console.log({ tree })

    this.view.root.update(tree)
  },

  togglePreviewPage(filePath) {
    atom.workspace.toggle(this.view).then(view => {
      if (view) {
        console.log('opened')
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
