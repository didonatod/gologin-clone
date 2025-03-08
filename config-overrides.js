const webpack = require('webpack');

module.exports = function override(config, env) {
  // Add fallback for node modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "fs": false,
    "path": require.resolve("path-browserify"),
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "zlib": require.resolve("browserify-zlib"),
    "url": require.resolve("url/"),
    "assert": require.resolve("assert/"),
    "util": require.resolve("util/"),
    "net": false,
    "tls": false,
    "dns": false,
    "child_process": false,
    "process": false
  };

  // Add plugins
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env),
      'process.browser': true,
      'process.version': JSON.stringify(process.version)
    })
  ];

  // Add module rules
  config.module.rules = [
    ...config.module.rules,
    {
      test: /\.(js|mjs|jsx|ts|tsx)$/,
      exclude: /@babel(?:\/|\\{1,2})runtime/,
      loader: require.resolve('babel-loader'),
      options: {
        babelrc: false,
        configFile: false,
        compact: false,
        presets: [
          [
            require.resolve('@babel/preset-env'),
            {
              targets: {
                browsers: ['last 2 versions', 'not dead', 'not < 2%']
              },
              modules: 'commonjs'
            }
          ],
          [
            require.resolve('@babel/preset-react'),
            {
              runtime: 'automatic',
              development: process.env.NODE_ENV === 'development'
            }
          ]
        ],
        plugins: [
          '@babel/plugin-transform-modules-commonjs',
          process.env.NODE_ENV === 'development' && require.resolve('react-refresh/babel')
        ].filter(Boolean),
        cacheDirectory: true,
        cacheCompression: false,
        sourceMaps: true
      }
    }
  ];

  return config;
}; 