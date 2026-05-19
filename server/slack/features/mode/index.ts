import * as modeCmd from './commands';
import * as setModeView from './views/set-mode';

export const mode = {
  commands: [
    { name: modeCmd.name, execute: modeCmd.execute, help: modeCmd.help },
  ],
  views: [{ name: setModeView.name, execute: setModeView.execute }],
};
