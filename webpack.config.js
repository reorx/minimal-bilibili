const webpack = require('webpack')
const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const ExtReloader = require('@reorx/webpack-ext-reloader')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { merge } = require('webpack-merge')

const rootDir = path.resolve(__dirname)
const srcDir = path.join(rootDir, 'src')
const destDir = path.join(rootDir, 'build')

console.log('srcDir', srcDir)

const common = {
  entry: {
    background: path.join(srcDir, 'background.ts'),
    popup: path.join(srcDir, 'popup.ts'),
    options: path.join(srcDir, 'options.ts'),
    content_script: path.join(srcDir, 'content_script.ts'),
    content_style: path.join(srcDir, 'content_style.scss'),
    inject: path.join(srcDir, 'inject.ts'),
  },
  output: {
    path: destDir,
    filename: 'js/[name].js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        // options: {
        //   projectReferences: true,
        // }
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      // https://stackoverflow.com/a/67307684/596206
      {
        test: /\.scss$/i,
        use: [
          'sass-loader',
        ],
        type: 'asset/resource',
        generator: {
          filename: 'css/[name].css'
        }
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    plugins: [new TsconfigPathsPlugin()],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: path.join(rootDir, 'public'), to: destDir }],
    }),
  ],
}


function developmentConfig() {
  console.log('development config')
  const config = merge(common, {
    // `eval` could not be used, see https://stackoverflow.com/questions/48047150/chrome-extension-compiled-by-webpack-throws-unsafe-eval-error
    devtool: 'cheap-module-source-map',
    mode: 'development',
    plugins: [
      new ExtReloader({
        entries: {
          background: 'background',
          contentScript: ['content_script', 'content_style'],
        },
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      }),
    ],
  })

  if (process.env.MEASURE_SPEED) {
    const SpeedMeasurePlugin = require("speed-measure-webpack-plugin")
    const smp = new SpeedMeasurePlugin()
    config = smp.wrap(config)
  }
  return config
}


function productionConfig() {
  console.log('production config')
  const config = merge(common, {
    mode: 'production',
    plugins: [
      new webpack.DefinePlugin({
        'process.env.APP_ENV': JSON.stringify(process.env.APP_ENV),
      }),
    ],
  })
  return config
}


module.exports = process.env.NODE_ENV === 'production' ? productionConfig() : developmentConfig()
