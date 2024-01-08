const webpack = require('webpack')
const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const ExtReloader = require('@reorx/webpack-ext-reloader')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { merge } = require('webpack-merge')

const target = process.env.TARGET || 'chrome'
console.log(`build target: ${target}`)
const rootDir = path.resolve(__dirname)
const srcDir = path.join(rootDir, 'src')
const destDir = path.join(rootDir, 'build', target)

console.log('srcDir', srcDir)

const common = {
  entry: {
    background: path.join(srcDir, 'background.ts'),
    options: path.join(srcDir, 'options.ts'),
    content_script: path.join(srcDir, 'content_script.ts'),
    content_style: path.join(srcDir, 'content_style.scss'),
    video_content_script: path.join(srcDir, 'video_content_script.ts'),
    video_content_style: path.join(srcDir, 'video_content_style.scss'),
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
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        oneOf: [
          // https://stackoverflow.com/a/67307684/596206
          {
            test: /content_.+\.scss$/i,
            use: [
              'sass-loader',
            ],
            type: 'asset/resource',
            generator: {
              filename: 'css/[name].css'
            }
          },
          {
            test: /\.scss$/i,
            use: [
              'style-loader',
              'css-loader',
              'sass-loader',
            ],
          },
        ]
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    plugins: [new TsconfigPathsPlugin()],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: path.join(rootDir, 'public'), to: destDir },
        target === 'firefox' ? { from: path.join(rootDir, 'firefox/public'), to: destDir } : null,
      ].filter(Boolean),
    }),
  ],
}


function developmentConfig() {
  console.log('development config')
  const config = merge(common, {
    // `eval` could not be used, see https://stackoverflow.com/questions/48047150/chrome-extension-compiled-by-webpack-throws-unsafe-eval-error
    // devtool: 'cheap-module-source-map',
    devtool: false,
    mode: 'development',
    plugins: [
      new ExtReloader({
        port: process.env.EXT_RELOADER_PORT || 9110,
        entries: {
          background: 'background',
          contentScript: ['content_script', 'content_style', 'video_content_script', 'video_content_style'],
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
