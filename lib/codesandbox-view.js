'use babel'

import React from 'react'
import { render } from 'react-dom'

import Root from './Root'

export default class CodesandboxView {
  constructor() {
    const element = document.createElement('div')
    render(<Root ref={this.ref} />, element)
    this.element = element.firstElementChild
  }

  getTitle = () => 'Codesandbox Preview'
  getURI = () => 'atom://codesandbox'
  getDefaultLocation = () => 'right'

  ref = instance => {
    instance && (this.root = instance)
  }

  serialize() {}

  destroy() {
    this.element.remove()
  }

  getElement = () => {
    return this.element
  }
}
