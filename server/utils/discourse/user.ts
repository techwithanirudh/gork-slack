import { getSession } from '~~/client/sdk.gen';
import { client } from './client';

export const getBotUser = async () => {
  // const { user_id: botUserId } = await client.auth.test();
  const res = await getSession({
    client
  });

  if (!res?.data?.current_user) {
    throw new Error('Session is undefined');
  }

  const { current_user: user } = res.data;

  if (!user) {
    throw new Error('botUser is undefined');
  }

  return user;
};
