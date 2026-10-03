import { mode } from '../features/mode';
import { optOut } from '../features/opt-out';
import { reports } from '../features/reports';

export const views = [...reports.views, ...mode.views, ...optOut.views];
