import * as monaco from 'monaco-editor';
import throttle =  require('lodash.throttle');
import kebabCase =  require('lodash.kebabcase');

import { COMMANDS, executeCommand } from './commands';
import { monacoToEmacsKey, Emitter } from './util';
import { BasicInputWidget } from './basicInput';
import { State, EAT_UP_KEY } from './state';

type CursorStyle = 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin';
type CursorBlinking = 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';

interface Configuration {
  readonly seedSearchStringFromSelection: monaco.editor.IEditorFindOptions['seedSearchStringFromSelection'];
  readonly cursorStyle: CursorStyle;
  readonly cursorBlinking: CursorBlinking;
}

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
  private _intialCursorType: CursorStyle;
  private _intialCursorBlinking: CursorBlinking;
  private _basicInputWidget: BasicInputWidget;
  private _state: State = new State();
  private _onDidMarkChange: Emitter<boolean> = new Emitter<boolean>();
  public onDidMarkChange = this._onDidMarkChange.event;
  private _onDidChangeKey: Emitter<string> = new Emitter<string>();
  public onDidChangeKey = this._onDidChangeKey.event;

  constructor(editor: monaco.editor.IStandaloneCodeEditor) {
    this._editor = editor;
    const config = getConfiguration(editor);
    this._intialCursorType = config.cursorStyle;
    this._intialCursorBlinking = config.cursorBlinking;
    this._basicInputWidget = new BasicInputWidget();
  }

  public start() {
    if (this._disposables.length) {
      return;
    }

    this.addListeners();
    this._editor.updateOptions({
      cursorStyle: kebabCase(TextEditorCursorStyle[TextEditorCursorStyle.Block]) as CursorStyle,
      cursorBlinking: kebabCase(TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle.Blink]) as CursorBlinking,
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
    // Allow previously registered keydown listeners to handle the event and
    // prevent this extension from also handling it.
    if (ev.browserEvent.defaultPrevented) {
      return;
    }

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
      // Set the last key handled, as this may still trigger an action in the
      // editor.
      this._state.setLastCommandKey(key);
      return;
    }

    this.cancelKey(ev);
    const repeatedTrigger = this._state.isLastCommandKey(key);
    executeCommand(this, command, this._state.getInputBuffer(), repeatedTrigger);
    // Track the last key handled for commands like Ctrl-K that have different
    // side effects if they are repeated.
    this._state.setLastCommandKey(key);
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

export function getConfiguration(editor: monaco.editor.IStandaloneCodeEditor): Configuration {

  const findOptions = editor.getOption(monaco.editor.EditorOption.find);
  const cursorStyle = editor.getOption(monaco.editor.EditorOption.cursorStyle);
  const cursorBlinking = editor.getOption(monaco.editor.EditorOption.cursorBlinking);

  return {
    seedSearchStringFromSelection: findOptions.seedSearchStringFromSelection,
    cursorStyle: kebabCase(TextEditorCursorStyle[cursorStyle]) as CursorStyle,
    cursorBlinking: kebabCase(TextEditorCursorBlinkingStyle[cursorBlinking]) as CursorBlinking,
  };
}
