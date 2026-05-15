export interface HelpSubcommand {
  description: string;
  permissions?: string[];
  usage: string;
}

export interface HelpMode {
  description: string;
  name: string;
}

export interface CommandHelp {
  description: string;
  modes?: HelpMode[];
  name: string;
  subcommands: HelpSubcommand[];
}
