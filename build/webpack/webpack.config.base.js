const fs = require('fs')
const path = require('path')
const webpack = require('webpack')

const electronRoot = path.resolve(__dirname, '../..')

const onlyPrintingGraph = !!process.env.PRINT_WEBPACK_GRAPH

class AccessDependenciesPlugin {
  apply (compiler) {
    // Only hook into webpack when we are printing the dependency graph
    if (!onlyPrintingGraph) return

    compiler.hooks.compilation.tap('AccessDependenciesPlugin', compilation => {
      compilation.hooks.finishModules.tap('AccessDependenciesPlugin', modules => {
        const filePaths = modules.map(m => m.resource).filter(p => p).map(p => path.relative(electronRoot, p))
        console.info(JSON.stringify(filePaths))
      })
    })
  }
}

module.exports = ({ alwaysHasNode, targetDeletesNodeGlobals, target }) => {
  let entry = path.resolve(electronRoot, 'lib', target, 'init.ts')
  if (!fs.existsSync(entry)) {
    entry = path.resolve(electronRoot, 'lib', target, 'init.js')
  }

  return ({
    mode: 'development',
    devtool: 'inline-source-map',
    entry,
    target: alwaysHasNode ? 'node' : 'web',
    output: {
      filename: `${target}.bundle.js`
    },
    resolve: {
      alias: {
        '@electron/internal': path.resolve(electronRoot, 'lib'),
        'electron': path.resolve(electronRoot, 'lib', target, 'api', 'exports', 'electron.js')
      },
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(electronRoot, 'tsconfig.electron.json'),
            transpileOnly: onlyPrintingGraph
          }
        }
      ]
    },
    node: {
      __dirname: false,
      __filename: false
    },
    plugins: [
      new AccessDependenciesPlugin(),
      ...(targetDeletesNodeGlobals ? [
        new webpack.ProvidePlugin({
          process: ['@electron/internal/renderer/webpack-provider', 'process'],
          global: ['@electron/internal/renderer/webpack-provider', '_global'],
          Buffer: ['@electron/internal/renderer/webpack-provider', 'Buffer'],
        })
      ] : [])
    ]
  })
}
