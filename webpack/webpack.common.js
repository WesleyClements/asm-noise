const path = require('path');

module.exports = {
  entry: './src/index.mjs',
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'asm-noise.js',
    library: 'noise',
    libraryExport: 'default',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
};
