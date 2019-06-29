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

#### Unregister default keys

```js
import { unregisterKey } from 'monaco-emacs';

unregisterKey('Tab');
```

#### Get all available mappings

```js
import { getAllMappings } from 'monaco-emacs';

console.log(getAllMappings());
```

#### AMD

If you are following the official guide and integrating the AMD version of `monaco-editor`, you can follow this -

```html
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta http-equiv="Content-Type" content="text/html;charset=utf-8" >
</head>
<body>

<div id="container" style="width:800px;height:600px;border:1px solid grey"></div>
<div id="status"></div>

<script src="https://unpkg.com/monaco-editor/min/vs/loader.js"></script>
<script>
  require.config({
    paths: {
      'vs': 'https://unpkg.com/monaco-editor/min/vs',
      'monaco-emacs': 'https://unpkg.com/monaco-emacs/dist/monaco-emacs',
    }
  });
  require(['vs/editor/editor.main', 'monaco-emacs'], function(a, MonacoEmacs) {
    var editor = monaco.editor.create(document.getElementById('container'), {
      value: [
        'function x() {',
        '\tconsole.log("Hello world!");',
        '}'
      ].join('\n'),
      language: 'javascript'
    });
    var statusNode = document.getElementById('status');
    var emacsMode = new MonacoEmacs.EmacsExtension(editor);
    emacsMode.onDidMarkChange(function(ev) {
      statusNode.textContent = ev ? 'Mark Set!' : 'Mark Unset';
    });
    emacsMode.onDidChangeKey(function(str) {
      statusNode.textContent = str;
    });
    emacsMode.start();

    // remove emacs mode by calling
    // emacsMode.dispose();
  });
</script>
</body>
</html>
```

Please [report](https://github.com/brijeshb42/monaco-emacs/issues/new) any inconsistencies or missing key bindings.
