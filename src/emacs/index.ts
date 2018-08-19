import * as monaco from 'monaco-editor';
import throttle =  require('lodash.throttle');

import { COMMANDS, executeCommand } from './commands';
import { monacoToEmacsKey, Emitter } from './util';
import { BasicInputWidget } from './basicInput';
import { State, EAT_UP_KEY } from './state';

const {
  TextEditorCursorBlinkingStyle,
  TextEditorCursorStyle,
} = monaco.editor;

export class EmacsExtension implements monaco.IDisposable {
  private _editor: monaco.editor.IStandaloneCodeEditor;
  private _disposables: monaco.IDisposable[] = [];
  private _inSelectionMode: boolean = false;
  private _changeDisposable: monaco.IDisposable = null;
  private _throttledScroll;
  private _intialCursorType: string;
  private _intialCursorBlinking: string;
  private _basicInputWidget: BasicInputWidget;
  private _state: State = new State();
  private _onDidMarkChange: Emitter<boolean> = new Emitter<boolean>();
  public onDidMarkChange = this._onDidMarkChange.event;
  private _onDidChangeKey: Emitter<string> = new Emitter<string>();
  public onDidChangeKey = this._onDidChangeKey.event;

  constructor(editor: monaco.editor.IStandaloneCodeEditor) {
    this._editor = editor;
    const config = editor.getConfiguration().viewInfo;
    this._intialCursorType = TextEditorCursorStyle[config.cursorStyle].toLowerCase();
    this._intialCursorBlinking = TextEditorCursorBlinkingStyle[config.cursorBlinking].toLowerCase();
    this._basicInputWidget = new BasicInputWidget();
  }

  public start() {
    if (this._disposables.length) {
      return;
    }

    this.addListeners();
    this._editor.updateOptions({
      cursorStyle: TextEditorCursorStyle[TextEditorCursorStyle.Block].toLowerCase(),
      cursorBlinking: TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle.Blink].toLowerCase(),
    });

    this._editor.addOverlayWidget(this._basicInputWidget);
  }

  public get state(): State {
    return this._state;
  }

  public getEditor(): monaco.editor.IStandaloneCodeEditor {
    return this._editor;
  }

  private addListeners() {
    this._disposables.push(this._editor.onKeyDown(this.onKeyDown.bind(this)));
    this._throttledScroll = throttle(this.onEditorScroll.bind(this), 500);
    this._disposables.push(this._editor.onDidScrollChange(this._throttledScroll));
  }

  private cancelKey(ev: monaco.IKeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  /**
   * @todo Refactor this function as it may lead to future complexity
   * and it is the entry point for all key presses.
   */
  private onKeyDown(ev: monaco.IKeyboardEvent) {
    let key = monacoToEmacsKey(ev);

    if (!key) {
      return;
    }

    key = this._state.updateAndGetKey(key);
    this._onDidChangeKey.fire(this._state.getReadableState());

    if (key === EAT_UP_KEY) {
      this._onDidChangeKey.fire(this._state.getReadableState());
      this.cancelKey(ev);
      return;
    }

    const command = COMMANDS[key];

    if (!command) {
      this._onDidChangeKey.fire(this._state.getReadableState());
      return;
    }

    this.cancelKey(ev);
    executeCommand(this, command, this._state.getInputBuffer());
    this._state.updateStateOnExecution();
    // this._onDidChangeKey.fire('');
  }

  onEditorScroll() {
    const { height } = this._editor.getLayoutInfo();
    const layout = this._editor.getScrolledVisiblePosition(this._editor.getPosition());

    if (layout.top >= 0 && layout.top <= height) {
      return;
    }

    const ranges = this._editor.getVisibleRanges();

    if (!ranges.length) {
      return;
    }

    let newPos: monaco.Position;
    const sel = this._editor.getSelection();

    if (layout.top < 0) {
      newPos = new monaco.Position(ranges[0].getStartPosition().lineNumber, 1);
    } else if (layout.top > height) {
      newPos = new monaco.Position(ranges[ranges.length - 1].getEndPosition().lineNumber, 1);
    }

    if (this._inSelectionMode) {
      this._editor.setSelection(monaco.Selection.fromPositions(sel.getStartPosition(), newPos));
    } else {
      this._editor.setPosition(newPos);
    }
  }

  private onContentChange() {
    this.selectionMode = false;
  }

  clearState() {
    this._state.updateStateOnExecution();
  }

  public set selectionMode(mode: boolean) {
    if (mode === this._inSelectionMode) {
      return;
    }

    this._inSelectionMode = mode;

    if (mode) {
      this._changeDisposable = this._editor.onDidChangeModelContent(this.onContentChange.bind(this));
    } else if (this._changeDisposable) {
      this._changeDisposable.dispose();
      this._changeDisposable = null;
    }
    this._onDidMarkChange.fire(mode);
  }

  public get selectionMode(): boolean {
    return this._inSelectionMode;
  }

  public getCursorAnchor(): monaco.Position {
    const sel = this._editor.getSelection();
    const dir = sel.getDirection();
    return dir === monaco.SelectionDirection.LTR ? sel.getEndPosition() : sel.getStartPosition();
  }

  public getBasicInput(message: string): Promise<string> {
    return this._basicInputWidget.getInput(message);
  }

  dispose(): void {
    this._disposables.forEach(d => d.dispose());
    this._disposables = undefined;

    if (this._changeDisposable) {
      this._changeDisposable.dispose();
      this._changeDisposable = null;
    }

    this._editor.updateOptions({
      cursorStyle: this._intialCursorType,
      cursorBlinking: this._intialCursorBlinking,
    });

    this._editor.removeOverlayWidget(this._basicInputWidget);
    this._basicInputWidget.dispose();
    this._throttledScroll.cancel();
    this._state = null;
  }
}
