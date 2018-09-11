# Codesandbox.io for Atom

`apm install atom-codesandbox`

An Atom package that let's you magically preview your current file in a Codesandbox pane.

No dependency management needed, just `import` or `require` what you need and Codesandbox's hosted bundler Sandpack will hot-reload and preview your code!

![Animated gif showing example usage](/demo.gif?raw=true)

### How-to

Create a javascript file, save it, then run `Codesandbox: Toggle Preview Pane` from the Command Palette.

For example:

```js
import randomColor from 'randomcolor'

console.log(randomColor())
```

You'll see a random color appear in the Preview Pane console!

#### Rendering

There's a `<div id="root"></div>` that's available to your code, if you want to render something to the DOM, for example with React:

```js
import React from 'react'
import { render } from 'react-dom'

render(<marquee>Hello world!</marquee>, document.getElementById('root'))
```

### Keymap

This package does not assign a shortcut by default, you can
run `Application: Open Your Keymap` from the Command Palette add one of your choosing to your `keymap.cson`:

```coffee
'atom-text-editor:not([mini])':
  'ctrl-alt-c': 'codesandbox:toggle-preview-pane'
```

### Caveats

There's no support (yet) for special configuration via `package.json` or `webpack.config.js`.

### Top secret stuff?

Currently, this package will look at the active file and recursively gather its dependencies.
The gathered files are bundled locally in a ServiceWorker, but nothing will be persisted until you choose to 'Open In Codesandbox' at which point they are turned into a dedicated Sandbox.

### Thanks

https://github.com/CompuIves/ for his incredible work and stewardship of Codesandbox without this would be impossible
