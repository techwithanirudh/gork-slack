import { defineEventHandler } from 'h3';

export default defineEventHandler((event) => {
  return {
    status: 'ok',
    message: 'Discourse API is running',
  }
});
