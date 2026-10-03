import * as optInAction from './actions/opt-in';
import * as optinCmd from './commands/optin';
import * as optoutCmd from './commands/optout';
import { optInView, optOutView } from './views/opt-out';

export const optOut = {
  actions: [{ name: optInAction.name, execute: optInAction.execute }],
  views: [optOutView, optInView],
  commands: [
    { name: optoutCmd.name, execute: optoutCmd.execute, help: optoutCmd.help },
    { name: optinCmd.name, execute: optinCmd.execute, help: optinCmd.help },
  ],
};
