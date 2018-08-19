import { EmacsExtension } from './emacs';
export { registerGlobalCommand, getAllMappings } from './emacs/commands';
import * as Actions from './emacs/actions';
export { EmacsExtension, Actions };
export default EmacsExtension;
