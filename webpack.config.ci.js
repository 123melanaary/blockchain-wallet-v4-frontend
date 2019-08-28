/* eslint-disable */
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin
const CleanWebpackPlugin = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const Webpack = require('webpack')
const path = require('path')
const PATHS = require('./config/paths')

const mainProcessBabelConfig = require(`./packages/main-process/babel.config`)
const securityProcessBabelConfig = require(`./packages/security-process/babel.config`)

let envConfig = {}
let manifestCacheBust = new Date().getTime()
const runBundleAnalyzer = process.env.ANALYZE

module.exports = {
  mode: 'production',
  node: {
    fs: 'empty'
  },
  entry: {
    index: ['@babel/polyfill', `./packages/root-process/src/index.js`],
    main: ['@babel/polyfill', './packages/main-process/src/index.js'],
    security: ['@babel/polyfill', './packages/security-process/src/index.js']
  },
  output: {
    path: PATHS.ciBuild,
    chunkFilename: '[name].[chunkhash:10].js',
    publicPath: '/',
    crossOriginLoading: 'anonymous'
  },
  stats: 'verbose',
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(__dirname, `packages/security-process/src`),
        use: [
          { loader: 'thread-loader', options: { workerParallelJobs: 50 } },
          {
            loader: 'babel-loader',
            options: securityProcessBabelConfig(
              null,
              `./packages/security-process`
            )
          }
        ]
      },
      {
        test: /\.js$/,
        exclude: path.resolve(__dirname, `packages/security-process/src`),
        use: [
          { loader: 'thread-loader', options: { workerParallelJobs: 50 } },
          {
            loader: 'babel-loader',
            options: mainProcessBabelConfig(null, `./packages/main-process`)
          }
        ]
      },
      {
        test: /\.(eot|ttf|otf|woff|woff2)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'fonts/[name]-[hash].[ext]'
          }
        }
      },
      {
        test: /\.(png|jpg|gif|svg|ico|webmanifest|xml)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'img/[name].[ext]'
          }
        }
      },
      {
        test: /\.(pdf)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'resources/[name]-[hash].[ext]'
          }
        }
      },
      {
        test: /\.css$/,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }]
      }
    ]
  },
  // performance: {
  //   hints: `error`
  // },
  plugins: [
    new CleanWebpackPlugin(),
    new Webpack.DefinePlugin({
      APP_VERSION: JSON.stringify(require(PATHS.pkgJson).version),
      NETWORK_TYPE: JSON.stringify(envConfig.NETWORK_TYPE)
    }),
    new HtmlWebpackPlugin({
      chunks: [`index`],
      template: './packages/root-process/src/index.html',
      filename: 'index.html'
    }),
    new HtmlWebpackPlugin({
      chunks: [`main`],
      template: './packages/main-process/src/index.html',
      filename: 'main.html'
    }),
    new HtmlWebpackPlugin({
      chunks: [`security`],
      template: './packages/security-process/src/index.html',
      filename: 'security.html'
    }),
    new Webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/
    }),
    ...(runBundleAnalyzer ? [new BundleAnalyzerPlugin({})] : [])
  ],
  optimization: {
    namedModules: true,
    minimizer: [
      new UglifyJSPlugin({
        uglifyOptions: {
          warnings: false,
          compress: {
            keep_fnames: true
          },
          mangle: {
            keep_fnames: true
          }
        },
        parallel: true,
        cache: false
      })
    ],
    concatenateModules: true,
    runtimeChunk: {
      name: `manifest.${manifestCacheBust}`
    }
  }
}
