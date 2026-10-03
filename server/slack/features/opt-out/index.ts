import * as optinCmd from './commands/optin';
import * as optoutCmd from './commands/optout';

export const optOut = {
  commands: [
    { name: optoutCmd.name, execute: optoutCmd.execute, help: optoutCmd.help },
    { name: optinCmd.name, execute: optinCmd.execute, help: optinCmd.help },
  ],
};
