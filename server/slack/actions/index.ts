import { optOut } from '../features/opt-out';
import { reports } from '../features/reports';
import {
  execute as retryPingExecute,
  name as retryPingName,
} from './retry-ping';

export const actions = [
  ...reports.actions,
  ...optOut.actions,
  { name: retryPingName, execute: retryPingExecute },
];
