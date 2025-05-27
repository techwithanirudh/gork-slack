//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: 'server',
  preset: 'vercel',
  compatibilityDate: '2025-05-24',
  imports: {
    autoImport: false,
  },
  esbuild: {
    options: {
      target: 'esnext',
    },
  },
});
