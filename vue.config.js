// vue.config.js
module.exports = {
  devServer: {
    proxy: {
      '^/binance': {
        target: 'https://api.binance.com',
        changeOrigin: true,
        secure: true,
        pathRewrite: { '^/binance': '' },
        logLevel: 'debug'
      },
      // WebSocket kullanırsan lazım olur:
      '^/stream': {
        target: 'https://stream.binance.com:9443',
        changeOrigin: true,
        ws: true,
        pathRewrite: { '^/stream': '' },
        logLevel: 'debug'
      }
    }
  }
}
