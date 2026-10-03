import { mode } from '~/slack/features/mode';
import { optOut } from '~/slack/features/opt-out';
import { reports } from '~/slack/features/reports';
import * as ping from './ping';

export const subcommands = [
  ...reports.commands,
  ...mode.commands,
  ...optOut.commands,
  { name: ping.name, execute: ping.execute, help: ping.help },
];
