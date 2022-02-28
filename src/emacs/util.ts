import * as monaco from 'monaco-editor';

export const modifierKeys: {[key: string]: string} = {
  Alt: 'M',
  Control: 'C',
  Ctrl: 'C',
  Meta: 'CMD',
  Shift: 'S',
};

const specialKeys: Record<string, string> = {
  Enter: 'Return',
  Space: 'SPC',
  Backslash: '\\',
  Slash: '/',
  Backquote: '`',
  BracketRight: ']',
  BracketLeft: '[',
  Comma: ',',
  Period: '.',
  Equal: '=',
  Minus: '-',
  Quote: '\'',
  Semicolon: ';',
};

const oneCharKeyPrefixes = ['Key', 'Numpad']
const arrowSuffix = 'Arrow'

export function monacoToEmacsKey(ev: monaco.IKeyboardEvent): string {
  const keyName = monaco.KeyCode[ev.keyCode];
  if (modifierKeys[keyName]) {
    return '';
  }

  let key = oneCharKeyPrefixes.some(prefix => keyName.startsWith(prefix)) ? keyName[keyName.length - 1] : keyName;

  if (keyName.endsWith(arrowSuffix)) {
    key = keyName.substring(0, keyName.length - arrowSuffix.length);
  } else if (specialKeys[keyName]) {
    key = specialKeys[key];
  }

  if (key.length === 1) {
    key = key.toLowerCase();
  }

  if (ev.altKey) {
    key = `${modifierKeys.Alt}-${key}`;
  }
  if (ev.ctrlKey) {
    key = `${modifierKeys.Ctrl}-${key}`;
  }
  if (ev.metaKey) {
    key = `${modifierKeys.Meta}-${key}`;
  }
  if (ev.shiftKey) {
    key = `${modifierKeys.Shift}-${key}`;
  }

  return key;
}

export interface Event<T> {
	(listener: (e: T) => any, thisArgs?: any, disposables?: monaco.IDisposable[]): monaco.IDisposable;
}

export namespace Event {
	const _disposable = { dispose() { } };
	export const None: Event<any> = function () { return _disposable; };
}

/**
 * Simplified implementation of monaco's Emitter
 */
export class Emitter<T> implements monaco.Emitter<T> {
  private _event: Event<T>;
  private _disposed: boolean;
  private _listeners: Function[] = [];

  get event(): Event<T> {
    if (!this._event) {
      this._event = (listener: (ev: T) => any) => {
        this._listeners.push(listener);
        const result = {
          dispose: () => {
            if (this._disposed) {
              return;
            }

            const index = this._listeners.indexOf(listener);
            if (index < 0) {
              return;
            }

            this._listeners.splice(index, 1);
          }
        };

        return result;
      };
    }
    return this._event;
  }

  fire(ev?: T): any {
    if (!this._listeners.length) {
      return;
    }

    this._listeners.forEach(l => l(ev));
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._listeners = undefined;
    this._disposed = true;
  }
}
