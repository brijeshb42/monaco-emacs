import { prefixPreservingKeys } from './commands';

export const EAT_UP_KEY = '==-==';

export class State {
  // Harcoded support for only C-u
  private _inargumentMode: boolean = false;
  private _prefixKey: string;
  private _inputBuffer: string;
  private _lastInputBuffer: string;
  private _killRing: string[] = [];

  public updateAndGetKey(key: string): string {
    if (key === 'C-g' && (this._inargumentMode || this._prefixKey)) {
      this.resetState();
      return EAT_UP_KEY;
    }

    if (this.updateCuMode(key)) {
      return EAT_UP_KEY;
    }

    if (!this._prefixKey) {
      if (prefixPreservingKeys[key]) {
        this._prefixKey = key;
        return EAT_UP_KEY;
      }
      return key;
    } else {
      return `${this._prefixKey} ${key}`
    }
  }

  private resetState(setLastInput: boolean = false) {
    this._inargumentMode = setLastInput;
    this._prefixKey = null;

    if (setLastInput) {
      this._lastInputBuffer = this._inputBuffer;
    } else {
      this._lastInputBuffer = null;
    }

    this._inputBuffer = null;
  }

  private updateCuMode(key): boolean {
    if (this._inargumentMode) {
      if (typeof key === 'string' && (/^\d$/.test(key))) {
        this._inputBuffer = (this._inputBuffer || '') + key;
        return true;
      } else if (prefixPreservingKeys[key]) {
        this.resetState(true);
        return false;
      }
    } else if (!this._prefixKey && key === 'C-u') {
      this._inargumentMode = true;
      this._inputBuffer = null;
      this._lastInputBuffer = null;
      return true;
    }
  }

  public updateStateOnExecution(reset: boolean = false) {
    this.resetState(reset);
  }

  public getInputBuffer() {
    return this._lastInputBuffer || this._inputBuffer;
  }

  public addToRing(str: string) {
    this._killRing.push(str);
    if (this._killRing.length > 50) this._killRing.shift();
  }

  public growRingTop(str: string) {
    if (!this._killRing.length) {
      this.addToRing(str);
      this._killRing[this._killRing.length - 1] += str;
    }
  }

  public getFromRing(n?: number) {
    return this._killRing[this._killRing.length - (n ? Math.min(n, 1): 1)] || '';
  }

  public popFromRing() {
    if (this._killRing.length > 1) {
      return this._killRing.pop();
    }

    return this.getFromRing();
  }

  public getReadableState(): string {
    let str = '';

    if (this._inargumentMode) {
      str += 'C-u'

      if (this._inputBuffer) {
        str += ` ${this._inputBuffer}`
      } else if (this._lastInputBuffer) {
        str += ` ${this._lastInputBuffer}`;
      }
    }

    if (this._prefixKey) {
      str += ` ${this._prefixKey}`
    }

    return str;
  }
}
