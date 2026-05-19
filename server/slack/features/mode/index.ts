import {
  execute as modeExecute,
  help as modeHelp,
  name as modeName,
} from './commands';
import {
  execute as setModeExecute,
  name as setModeName,
} from './views/set-mode';

export const mode = {
  commands: [{ name: modeName, execute: modeExecute }],
  views: [{ name: setModeName, execute: setModeExecute }],
  help: [modeHelp],
};
