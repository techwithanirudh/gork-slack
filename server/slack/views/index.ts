import { mode } from '../features/mode';
import { reports } from '../features/reports';

export const views = [...reports.views, ...mode.views];
