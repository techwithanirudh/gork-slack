import { mode } from '~/slack/features/mode';
import { reports } from '~/slack/features/reports';
import * as ping from './ping';

export const subcommands = [
  ...reports.commands,
  ...mode.commands,
  { name: ping.name, execute: ping.execute, help: ping.help },
];
