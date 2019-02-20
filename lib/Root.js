'use babel'

import React from 'react'
import { Console, Decode } from 'console-feed'
import SplitterLayout from 'react-splitter-layout'
import { Manager } from 'smooshpack'
import { listen } from 'codesandbox-api'
import { shell } from 'electron'

import Logo from './CodesandboxLogo'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const consoleTheme =
  atom.config.get('core.themes')[0].match(/(light|dark)/)[0] || 'dark'
const suppressedMessages = [
  'undefined used as a key, but it is not a string.',
  "Warning: unmountComponentAtNode(): The node you're attempting to unmount was rendered by another copy of React.",
]

export const DEFAULT_CONFIG = {
  files: {
    '/index.js': {
      code: '',
    },
  },
  dependencies: {},
  entry: '/index.js',
}

const DEFAULT_LOCATIONS = []
const DEFAULT_CURRENT_LOCATION_INDEX = -1

export default class Root extends React.Component {
  state = {
    weDidInitiateNavigation: false,
    locations: DEFAULT_LOCATIONS,
    currentLocationIndex: DEFAULT_CURRENT_LOCATION_INDEX,
    showOpenInCodeSandbox: false,
    showConsole: true,
    logs: [],
    status: null,
  }

  componentDidMount() {
    this.manager = window.manager = new Manager(this.frame, DEFAULT_CONFIG)

    this.disposeListener = listen(({ type, ...data }) => {
      // console.log(`[${type}]`, data)

      switch (type) {
        case 'status':
          let { status } = data
          if (status === 'idle') {
            status = ''
          }
          this.setState({ status })
          break

        case 'urlchange':
          this.setState(
            ({ locations, currentLocationIndex, weDidInitiateNavigation }) => {
              const shouldTruncateStack =
                currentLocationIndex < locations.length - 1

              if (weDidInitiateNavigation) {
                return { weDidInitiateNavigation: false }
              }

              if (shouldTruncateStack) {
                const left = locations.slice(0, currentLocationIndex + 1)
                let shouldPush = left[left.length - 1] !== data.url
                return {
                  locations: shouldPush ? [...left, data.url] : left,
                  currentLocationIndex: shouldPush
                    ? currentLocationIndex + 1
                    : currentLocationIndex,
                }
              }

              let shouldPush = locations[locations.length - 1] !== data.url
              return {
                locations: shouldPush ? [...locations, data.url] : locations,
                currentLocationIndex: shouldPush
                  ? currentLocationIndex + 1
                  : currentLocationIndex,
              }
            }
          )
          break

        case 'eval-result':
          const { result, error } = data
          const decoded = Decode(result)

          if (error) {
            this.addLog('error', [decoded])
          } else {
            this.addLog('result', [decoded])
          }
          break

        case 'console':
          const message = Decode(data.log)
          const { method, data: args } = message

          switch (method) {
            case 'clear':
              this.clearConsole()
              break

            default:
              if (!suppressedMessages.includes(args[0])) {
                this.addLog(method, args)
                break
              }
          }
          break

        default:
          break
      }
    })
  }

  addLog = (level, data) => {
    this.setState(({ logs }) => ({
      logs: [...logs, { method: level, data }],
    }))
  }

  clearConsole = () =>
    this.setState({
      logs: [],
    })

  update(tree) {
    this.clearConsole()
    this.manager.updatePreview({
      ...tree,
      showOpenInCodeSandbox: false,
    })
  }

  componentWillUnmount() {
    this.disposeListener()
  }

  ref = node => {
    node && (this.frame = node)
  }

  toggleConsole = () => {
    this.setState(({ showConsole }) => ({ showConsole: !showConsole }))
  }

  go = direction => {
    const { locations, currentLocationIndex } = this.state
    const action = direction > 0 ? 'urlforward' : 'urlback'
    this.setState(
      {
        currentLocationIndex: clamp(
          currentLocationIndex + direction,
          0,
          locations.length - 1
        ),
        weDidInitiateNavigation: true,
      },
      () => this.manager.dispatch({ type: action })
    )
  }

  refreshPreview = () => {
    const { locations, currentLocationIndex } = this.state
    const currentLocation = locations[currentLocationIndex]

    this.setState(
      {
        locations: [currentLocation],
        currentLocationIndex: 0,
      },
      () => this.manager.dispatch({ type: 'refresh' })
    )
  }

  handleConsoleInputRef = node => {
    if (node) {
      node.addEventListener('keydown', ({ key }) => {
        if (key === 'Enter') {
          const command = node.getModel().getText()
          if (command) {
            this.addLog('command', [command])
            this.manager.dispatch({ type: 'evaluate', command })
            node.getModel().setText('')
          }
        }
      })
    }
  }

  render() {
    const {
      logs,
      locations,
      currentLocationIndex,
      showConsole,
      status,
    } = this.state
    const currentLocation =
      locations[currentLocationIndex] || 'https://codesandbox.io/'
    const location = new URL(currentLocation).pathname
    const canGoForward = currentLocationIndex < locations.length - 1
    const canGoBackward = currentLocationIndex > 0

    return (
      <div className="codesandbox">
        <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
          <div
            className="text-subtle"
            style={{ flexGrow: 1, padding: '0 10px' }}
          >
            {status}
          </div>
          <div className="btn" onClick={this.toggleConsole}>
            <div className="icon icon-terminal" />
          </div>

          <div
            onClick={() => {
              this.manager
                .getCodeSandboxURL()
                .then(({ editorUrl }) => shell.openExternal(editorUrl))
            }}
            className="btn"
          >
            <Logo width="18px" style={{ marginRight: 10 }} />
            Open In Codesandbox
          </div>
        </div>

        <div style={{ position: 'relative', flexGrow: 1 }}>
          <SplitterLayout
            vertical
            percentage
            onDragStart={() => this.frame.classList.add('non-interactive')}
            onDragEnd={() => this.frame.classList.remove('non-interactive')}
            primaryMinSize={20}
            secondaryInitialSize={20}
            secondaryMinSize={20}
          >
            <div className="preview" style={{ marginBottom: showConsole && 0 }}>
              <div className="toolbar">
                <div
                  className="btn"
                  disabled={!canGoBackward}
                  onClick={() => this.go(-1)}
                >
                  <div className="icon icon-chevron-left" />
                </div>

                <div
                  className="btn"
                  disabled={!canGoForward}
                  onClick={() => this.go(1)}
                >
                  <div className="icon icon-chevron-right" />
                </div>

                <div className="btn" onClick={this.refreshPreview}>
                  <div className="icon icon-sync" />
                </div>

                <input
                  type="text"
                  disabled
                  value={location}
                  className="input-text"
                />
              </div>
              <iframe ref={this.ref} title="codesandbox-frame" />
            </div>

            {showConsole && (
              <div className="console">
                <div className="toolbar">
                  <div className="btn">
                    <div
                      className="icon icon-circle-slash"
                      onClick={this.clearConsole}
                    />
                  </div>
                </div>
                <div
                  className="scroll-view"
                  ref={node => {
                    if (node) {
                      node.scrollTop = node.scrollHeight
                    }
                  }}
                >
                  <Console
                    styles={{
                      BASE_FONT_FAMILY: atom.config.get('editor.fontFamily'),
                      TREENODE_FONT_FAMILY: atom.config.get(
                        'editor.fontFamily'
                      ),

                      ARROW_FONT_SIZE: atom.config.get('editor.fontSize') * 0.9,
                      BASE_FONT_SIZE: atom.config.get('editor.fontSize') * 0.9,
                      TREENODE_FONT_SIZE:
                        atom.config.get('editor.fontSize') * 0.9,

                      BASE_FONTLINE_HEIGHT:
                        atom.config.get('editor.lineHeight') - 0.3,
                      TREENODE_LINE_HEIGHT:
                        atom.config.get('editor.lineHeight') - 0.3,
                    }}
                    logs={logs}
                    variant={consoleTheme}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <div
                    className="icon icon-chevron-right"
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 4,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  />
                  <atom-text-editor ref={this.handleConsoleInputRef} mini />
                </div>
              </div>
            )}
          </SplitterLayout>
        </div>
      </div>
    )
  }
}
