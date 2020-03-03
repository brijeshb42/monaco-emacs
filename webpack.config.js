const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const pkg = require('./package.json');

const banner = [
  `${pkg.name}`,
  `Version - ${pkg.version}`,
  `Author - ${pkg.author}`,
].join('\n');

function getOutput(isProd = false) {
  const data = {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  };

  if (!isProd) {
    return data;
  }

  data.libraryTarget = 'umd';
  data.library = 'MonacoEmacs';
  data.globalObject = 'self';
  return data;
}

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  return {
    target: 'web',
    entry: {
      'monaco-emacs': isProd ? './src/index.ts' : './src/demo.ts',
    },
    output: getOutput(isProd),
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json', '.css'],
    },
    module: {
      rules: [{
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      }, {
        test: /\.ttf$/,
        use: 'file-loader',
      }].concat(!isProd ? [{
        test: /\.css?$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      }] : []),
    },
    plugins: isProd ? [
      new webpack.BannerPlugin(banner),
    ] : [
      new HtmlWebpackPlugin({
        template: path.join(__dirname, './index.html'),
      }),
      new MonacoWebpackPlugin(),
    ],
    externals: isProd ? {
      'monaco-editor': {
        root: 'monaco',
        commonjs: 'monaco-editor',
        commonjs2: 'monaco-editor',
        amd: 'vs/editor/editor.main',
      }
    } : {},
  }
};
