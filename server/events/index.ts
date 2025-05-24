import * as messageCreate from './message-create';
// import * as notification from './notification';

export const events = {
  messageCreate,
  // deprecated notifcation handler
  // as we now handle notifications in the message create handler
  // notification
};
