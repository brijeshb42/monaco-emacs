## monaco-emacs

[![npm version](https://badge.fury.io/js/monaco-emacs.svg)](https://www.npmjs.com/package/monaco-emacs)

Emacs key bindings for monaco-editor. [Demo](https://editor.bitwiser.in).

### Installation

```sh
npm install monaco-emacs
```

### Usage

#### Webpack/Browserify

```js
import * as monaco from 'monaco-editor';
import { EmacsExtension } from 'monaco-emacs';
```

#### Browser

* Add this script in your html - `https://unpkg.com/monaco-emacs/dist/monaco-emacs.js`.
* The extension will be available as `MonacoEmacs` on `window`

```js
const monaco = window.monaco;
const { EmacsExtension } = window.MonacoEmacs;
```

#### Code

```js
const editorNode = document.getElementById('editor');
const statusNode = document.getElementById('statusbar');

const editor = monaco.editor.create(editor);
const emacsMode = new EmacsExtension(editor);
emacsMode.onDidMarkChange((ev: boolean) => {
  statusNode.textContent = ev ? 'Mark Set!' : 'Mark Unset';
});
emacsMode.onDidChangeKey((str) => {
  statusNode.textContent = str;
});
emacsMode.start();

// If you want to remove the attached bindings, call
emacsMode.dispose();
```

Please [report](https://github.com/brijeshb42/monaco-emacs/issues/new) any inconsistencies or missing key bindings.
