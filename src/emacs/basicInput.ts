import * as monaco from 'monaco-editor';

const BASE_CLASS = 'ext-emacs-basic-input';

function generateCss() {
  return `
  .${BASE_CLASS} {
    color: #d4d4d4;
    transition: top 200ms linear;
    visibility: hidden;
    width: 200px;
    display: flex;
    align-items: center;
    padding: 5px;
  }

  .${BASE_CLASS}.${BASE_CLASS}-visible {
    visibility: visible;
  }

  .${BASE_CLASS} input {
    color: rgb(97, 97, 97);
    background-color: transparent;
    display: inline-block;
    box-sizing: border-box;
    height: 100%;
    line-height: inherit;
    border: none;
    font-family: inherit;
    font-size: inherit;
    resize: none;
    padding-top: 2px;
    padding-bottom: 2px;
    margin-left: 5px;
    max-width: 50px;
  }

  .${BASE_CLASS} input:focus {
    outline: none;
  }

  .vs .${BASE_CLASS} {
    color: rgb(97, 97, 97);
    background-color: #efeff2;
    box-shadow: 0 2px 8px #a8a8a8;
  }

  .vs-dark .${BASE_CLASS} {
    background-color: #2d2d30;
    box-shadow: 0 2px 8px #000000;
  }

  .vs-dark .${BASE_CLASS} input {
    color: rgb(204, 204, 204);
  }

  .hc-black .${BASE_CLASS} {
    border: 2px solid #6fc3df;
    background-color: #0c141f;
    color: #ffffff;
  }

  .hc-black .${BASE_CLASS} input {
    color: #ffffff;
  }
`;
}

export class BasicInputWidget implements monaco.IDisposable {
  private _dom: HTMLElement;
  private _input: HTMLInputElement;
  private _messageDom: HTMLElement;
  private _style: HTMLStyleElement;

  private _pendingPromise: {
    resolve: (string) => void,
    reject: () => void,
  } = null;

  constructor() {
    this._dom = document.createElement('div');
    this._messageDom = document.createElement('div');
    const medDom = document.createElement('div');
    this._dom.setAttribute('class', BASE_CLASS);
    this._dom.setAttribute('aria-hidden', 'true');
    this._input = document.createElement('input');
    this._dom.appendChild(this._messageDom);
    medDom.appendChild(this._input);
    this._dom.appendChild(medDom);
    this.addListeners();
    this._style = document.createElement('style');
    this._style.type = 'text/css';
    this._style.textContent = generateCss();
    (document.head || document.body).appendChild(this._style);
  }

  public getDomNode() {
    return this._dom;
  }

  public getId() {
    return 'extension.emacs.basicinput';
  }

  public getPosition() {
    return {
      preference: monaco.editor.OverlayWidgetPositionPreference.TOP_RIGHT_CORNER,
    }
  }

  private addListeners() {
    this._input.addEventListener('keydown', this.onKeyDown);
    this._input.addEventListener('blur', this.onBlur);
  }

  private onKeyDown = (ev: KeyboardEvent) => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) {
      ev.preventDefault();
      ev.stopPropagation();
    }

    if (ev.which === 13) {
      if (this._pendingPromise) {
        ev.preventDefault();
        this._pendingPromise.resolve((<HTMLInputElement>ev.target).value);
        this._pendingPromise = null;
      }
    } else if (ev.which === 27) {
      if (this._pendingPromise) {
        this._pendingPromise.reject();
        this._pendingPromise = null;
      }
    }
  }

  private onBlur = () => {
    if (this._pendingPromise) {
      this._pendingPromise.reject();
      this._pendingPromise = null;
    }
  }

  private showWidgetAndFocus(message: string) {
    this._dom.classList.add(`${BASE_CLASS}-visible`);
    this._dom.setAttribute('aria-hidden', 'false');
    this._messageDom.textContent = message;
    this._input.focus();
  }

  private cleanup() {
    this._dom.classList.remove(`${BASE_CLASS}-visible`);
    this._dom.setAttribute('aria-hidden', 'true');
    this._messageDom.textContent = '';
    this._input.placeholder = '';
    this._input.value = '';
  }

  getInput(message: string): Promise<string> {
    if (this._pendingPromise) {
      this._pendingPromise.reject();
      this._pendingPromise = null;
    }

    return new Promise((resolve, reject) => {
      this._pendingPromise = {
        resolve: (val) => {
          resolve(val);
          this.cleanup();
        },
        reject: () => {
          reject();
          this.cleanup();
        },
      };
      this.showWidgetAndFocus(message);
    });
  }

  dispose(): void {
    this.cleanup();
    this._input.removeEventListener('keydown', this.onKeyDown);
    this._input.removeEventListener('blur', this.onBlur);
    (document.head || document.body).removeChild(this._style);
  }
}
