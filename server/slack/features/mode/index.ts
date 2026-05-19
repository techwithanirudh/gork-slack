import {
  execute as setModeExecute,
  name as setModeName,
} from './views/set-mode';

export const mode = {
  views: [{ name: setModeName, execute: setModeExecute }],
};
