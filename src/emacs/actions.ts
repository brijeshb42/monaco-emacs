import * as monaco from 'monaco-editor';

import { EmacsExtension } from './index';

export const SOURCE = 'extension.emacs';

function moveCursor(editor: monaco.editor.IStandaloneCodeEditor, hasSelection: boolean, direction: string, unit: string, repeat: number = 1) {
  const action = `cursor${unit === 'word' ? 'Word' : ''}${direction}${hasSelection ? 'Select': ''}`;
  for (let i = 0; i < repeat; i++) {
    editor.trigger(SOURCE, action, null);
  }
}

export abstract class BaseAction {
  description: string = '';
  abstract run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void;
}

class TriggerAction extends BaseAction {
  trigger: string

  constructor(trigger: string) {
    super()
    this.trigger = trigger
  }

  run(editor: monaco.editor.IStandaloneCodeEditor) {
    editor.trigger(SOURCE, this.trigger, {})
  }
}

export class KillSelection extends BaseAction {
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    const selections = editor.getSelections();

    if (!selections.length) {
      return;
    }

    selections.forEach((sel) => {
      const text = editor.getModel().getValueInRange(sel);
      ext.state.addToRing(text);
      editor.executeEdits(SOURCE, [{
        range: sel,
        text: '',
      }]);
    });
  }
}

export class KillLines extends BaseAction {
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    ext.selectionMode = false;
    const model = editor.getModel();
    const pos = ext.getCursorAnchor();
    let endPos;

    if (repeat === 1) {
      const lineLength = model.getLineLength(pos.lineNumber);
      const isAtEnd = pos.column === lineLength + 1;
      if (!lineLength || isAtEnd) {
        if (repeatedTrigger) {
          ext.state.growRingTop(model.getEOL());
        } else {
          ext.state.addToRing(model.getEOL());
        }
        editor.trigger(SOURCE, 'deleteAllRight', null);
        return;
      } else {
        endPos = new monaco.Position(pos.lineNumber, model.getLineLength(pos.lineNumber) + 1);
      }
    } else {
      const totalLines = model.getLineCount();
      const endLine = (pos.lineNumber + repeat) > totalLines ? totalLines : (pos.lineNumber + repeat);
      endPos = new monaco.Position(endLine, model.getLineLength(endLine) + 1);
    }

    const range = monaco.Range.fromPositions(pos, endPos);

    if (repeatedTrigger) {
      ext.state.growRingTop(model.getValueInRange(range));
    } else {
      ext.state.addToRing(model.getValueInRange(range));
    }

    editor.executeEdits(SOURCE, [{
      range,
      text: '',
    }]);
    editor.setSelection(monaco.Selection.fromPositions(pos, pos));
  }
}

export class InsertLineBelow extends BaseAction {
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    const pos = editor.getPosition();
    editor.trigger(SOURCE, 'editor.action.insertLineAfter', null);
    editor.setPosition(pos);
  }
}

export class InsertLineAfter extends BaseAction {
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    let text = '';
    for(let i=0; i<repeat; i++) {
      text += editor.getModel().getEOL();
    }
    ext.selectionMode = false;
    const pos = ext.getCursorAnchor();
    editor.executeEdits(SOURCE, [{
      range: monaco.Range.fromPositions(pos),
      text,
      forceMoveMarkers: true,
    }]);
  }

}

export class SetMark extends BaseAction {
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    const mode = ext.selectionMode;
    const sel = editor.getSelection();
    const selEmpty = sel.isEmpty();

    if (!selEmpty) {
      const dir = sel.getDirection();

      if (dir === monaco.SelectionDirection.LTR) {
        editor.setSelection(monaco.Selection.fromPositions(sel.getEndPosition(), sel.getEndPosition()));
      } else {
        editor.setSelection(monaco.Selection.fromPositions(sel.getStartPosition(), sel.getStartPosition()));
      }
    }

    if (selEmpty && ext.selectionMode) {
      ext.selectionMode = false;
    } else {
      ext.selectionMode = true;
    }
  }
}

class MoveCursorAction extends BaseAction {
  direction: string;
  unit: string = 'char';

  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    moveCursor(editor, ext.selectionMode, this.direction, this.unit, repeat);
  }
}

export class MoveCursorUp extends MoveCursorAction {
  direction: string = 'Up';
}

export class MoveCursorDown extends MoveCursorAction {
  direction: string = 'Down';
}

export class MoveCursorLeft extends MoveCursorAction {
  direction: string = 'Left';
}

export class MoveCursorRight extends MoveCursorAction {
  direction: string = 'Right';
}

export class MoveCursorToLineEnd extends MoveCursorAction {
  direction: string = 'End';
}

export class MoveCursorToLineStart extends MoveCursorAction {
  direction: string = 'Home';
}

export class MoveCursorWordRight extends MoveCursorRight {
  unit: string = 'word'
}

export class MoveCursorWordLeft extends MoveCursorLeft {
  unit: string = 'word'
}

export class MoveCursorBottom extends MoveCursorAction {
  direction = 'Bottom'
}

export class MoveCursorTop extends MoveCursorAction {
  direction = 'Top'
}

export class KeyBoardQuit extends BaseAction {
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    ext.selectionMode = false;
    ext.clearState();
    editor.setPosition(editor.getPosition());
  }
}

class HistoryAction extends BaseAction {
  action: string;
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    for(let i = 0; i < repeat; i++) {
      editor.trigger(SOURCE, this.action, null);
    }
  }
}

export class UndoAction extends HistoryAction {
  action: string = 'undo';
}

export class RedoAction extends HistoryAction {
  action: string = 'redo';
}

export class Yank extends BaseAction {
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    const text = ext.state.getFromRing(repeat);
    if (!text) {
      return;
    }

    const pos = editor.getPosition();
    editor.executeEdits(SOURCE, [{
      range: monaco.Range.fromPositions(pos, pos),
      text,
      forceMoveMarkers: true,
    }]);
  }
}

export class YankSelectionToRing extends BaseAction {
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    const sel = editor.getSelection();
    if (sel.isEmpty()) {
      return;
    }

    ext.state.addToRing(editor.getModel().getValueInRange(sel));
    ext.selectionMode = false;
    const pos = ext.getCursorAnchor();
    editor.setSelection(monaco.Selection.fromPositions(pos, pos));
  }
}


export class YankRotate extends BaseAction {
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    const text = ext.state.popFromRing();

    if (!text) {
      return;
    }
    const pos = ext.getCursorAnchor();

    editor.executeEdits(SOURCE, [{
      range: monaco.Range.fromPositions(pos),
      text,
      forceMoveMarkers: true,
    }]);
  }
}

export class RevealEditorAction extends BaseAction {
  revealFunction: string;
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    const sel = editor.getSelection();

    if (this.revealFunction === 'up') {
      editor.trigger(SOURCE, 'scrollPageUp', null);
    } else {
      editor[this.revealFunction](sel);
    }
  }
}

export class RevealToTopAction extends RevealEditorAction {
  revealFunction = 'revealRangeAtTop';
}

export class RevealToCenterAction extends RevealEditorAction {
  revealFunction = 'revealRangeInCenter';
}

export class RevealToBottomAction extends RevealEditorAction {
  revealFunction = 'up';
}

export class InsertTabs extends BaseAction {
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    const model = editor.getModel();
    const { tabSize, insertSpaces } = model.getOptions();
    let text = '';

    for (let i=0; i < repeat; i++) {
      let spaces = '';
      for(let j=0; j<tabSize; j++) {
        spaces += ' ';
      }
      text += (insertSpaces ? spaces : '\t');
    }

    editor.executeEdits(SOURCE, [{
      range: editor.getSelection(),
      text,
      forceMoveMarkers: true,
    }]);
  }
}

export class RotateCursorOnScreen extends BaseAction {
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    const ranges = editor.getVisibleRanges();

    if (!ranges.length) {
      return;
    }

    const lineMapping: number[] = [];
    let start = 1;

    for(let i=0; i<ranges.length; i++) {
      const range = ranges[i];
      for (let j=range.startLineNumber; j<=range.endLineNumber; j++) {
        lineMapping.push(j);
      }
    }

    const pos = editor.getPosition();
    const expectedCenter = Math.ceil(lineMapping.length / 2);
    let toMovePos: monaco.Position;

    if (pos.lineNumber === lineMapping[expectedCenter]) {
      toMovePos = new monaco.Position(lineMapping[0], 1);
    } else if (pos.lineNumber === lineMapping[0]) {
      toMovePos = new monaco.Position(lineMapping[lineMapping.length - 1], 1);
    } else {
      toMovePos = new monaco.Position(lineMapping[expectedCenter], 1);
    }

    editor.setPosition(toMovePos);
  }
}


export class GotoLine extends BaseAction {
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    // if (repeat <= 1) {
    //   editor.trigger(SOURCE, 'editor.action.gotoLine', null);
    //   return;
    // }

    ext.getBasicInput('Goto Line: ').then(val => {
      let line = parseInt(val) || 0;
      const model = editor.getModel();
      const totalLines = model.getLineCount();
      editor.focus();

      if (!line) {
        line = 1;
      } else if (line > totalLines) {
        line = totalLines;
      }

      const pos = new monaco.Position(line, 1);
      let range: monaco.Selection;

      if (!ext.selectionMode) {
        range = monaco.Selection.fromPositions(pos);
      } else {
        const sel = editor.getSelection();
        if (sel.getDirection() === monaco.SelectionDirection.LTR) {
          range = monaco.Selection.fromPositions(sel.getStartPosition(), pos);
        } else {
          range = monaco.Selection.fromPositions(sel.getEndPosition(), pos);
        }
      }

      editor.setSelection(range);
      editor.revealRangeInCenter(range);
    }).catch(() => {
      editor.focus();
    });
  }
}

export class InvertSelection extends BaseAction {
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    const sel = editor.getSelection();

    if (sel.isEmpty()) {
      return;
    }

    let newSel: monaco.Selection;

    if (sel.getDirection() === monaco.SelectionDirection.LTR) {
      newSel = monaco.Selection.fromPositions(sel.getEndPosition(), sel.getStartPosition());
    } else {
      newSel = monaco.Selection.fromPositions(sel.getStartPosition(), sel.getEndPosition());
    }

    editor.setSelection(newSel);
  }
}

export class Search extends TriggerAction {
  constructor() {
    super('editor.actions.findWithArgs')
  }
}

export class SearchReplace extends TriggerAction {
  constructor() {
    super('editor.action.startFindReplaceAction')
  }
}

export class DeleteLines extends BaseAction {
  run(editor: monaco.editor.IStandaloneCodeEditor, ext: EmacsExtension, repeat: number, repeatedTrigger: boolean): void {
    ext.selectionMode = false;
    for(let i=0; i<repeat; i++) {
      editor.trigger(SOURCE, 'editor.action.deleteLines', null);
    }
  }
}
