const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

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
  return data;
}

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  return {
    target: 'web',
    entry: {
      'monaco-editor': isProd ? './src/index.ts' : './src/demo.ts',
    },
    output: getOutput(isProd),
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json', '.css'],
    },
    module: {
      rules: [{
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            compact: false,
          },
        },
      }, {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      }, {
        test: /\.css$/,
        // exclude: /node_modules/,
        use: [
          'style-loader',
          'css-loader',
        ],
      }],
    },
    plugins: isProd ? [] : [
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
        amd: 'monaco-editor',
      }
    } : {},
  }
};
