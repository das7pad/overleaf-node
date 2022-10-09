module.exports = {
  esbuild: {
    autoReload: process.env.ESBUILD_AUTO_RELOAD !== 'false',
    host: process.env.ESBUILD_HOST,
    port: parseInt(process.env.ESBUILD_PORT, 10) || undefined,
    proxyForInMemoryRequests: process.env.ESBUILD_PROXY_FOR_IN_MEMORY_REQUESTS,
  },
}
