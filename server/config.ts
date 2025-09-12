export const keywords = ['zenix', 'zenith', 'ai', 'bot', 'zen'];
export const keywordRegex = /\b(zenix|zenith|ai|bot|zen)\b/i;
export const country = 'Greece';
export const city = 'Athens';
export const timezone = 'Europe/Athens';

export const speed = {
  minDelay: 3,
  maxDelay: 8,
  speedMethod: 'divide',
  speedFactor: 80,
};

// export const statuses = ["online", "idle", "dnd", "offline"];
// export const statuses = [
//   { type: ActivityType.Playing, name: "with humans 🤖" },
//   { type: ActivityType.Listening, name: "to conversations 👂" },
//   { type: ActivityType.Watching, name: "the server 👀" },
//   { type: ActivityType.Competing, name: "in chatting 💭" },
// ] as const;

export const messageThreshold = 10;
