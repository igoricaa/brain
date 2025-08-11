const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');


module.exports = {
    entry: {
        main: ['./assets/js/main.js', './assets/scss/main.scss'],
        company_detail: ['./assets/js/company_detail.js'],
        deck_create: ['./assets/js/deck_create.js'],
        deal_detail: ['./assets/js/deal_detail.js'],
        deals_dashboard: ['./assets/js/deals_dashboard.js'],
        du_dashboard: ['./assets/js/du_dashboard.js'],
    },
    output: {
        path: path.resolve('./assets/dist/'),
        filename: '[name].js',
    },

    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[id].css',
        }),

        new CopyPlugin({
            patterns: [
                {
                    from: 'assets/images',
                    to: 'images'
                }
            ]
        })
    ],

    module: {
        rules: [
            {
                test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
                type: 'asset/resource',
                generator: {
                      filename: 'fonts/[name][ext]',
                },
            },
            {
                test: /\.(jpg|png|gif|svg)(\?v=\d+\.\d+\.\d+)?$/,
                type: 'asset/resource',
                generator: {
                      filename: 'images/[name][ext]',
                },
            },
            {
                test: /\.css$/,
                use: [{
                    // Extract CSS into separate files.
                    loader: MiniCssExtractPlugin.loader,
                }, {
                    loader: 'css-loader',
                }]
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    {
                        // Extract CSS into separate files.
                        loader: MiniCssExtractPlugin.loader,
                    }, {
                        // Translates CSS into CommonJS
                        loader: 'css-loader'
                    }, {
                        // Run post css actions
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: function () {
                                    // post css plugins, can be exported to
                                    // postcss.config.js
                                    return [
                                        require('precss'),
                                        require('autoprefixer')
                                    ];
                                }
                            }
                        }
                    }, {
                        // Compiles Sass to CSS
                        loader: 'sass-loader'
                    },
                ],
            },
            // See: https://webpack.js.org/loaders/expose-loader/
            {
                test: require.resolve('jquery'),
                loader: 'expose-loader',
                options: {
                    exposes: ['$', 'jQuery']
                }
            }
        ],
    },
    resolve: {
        alias: {
            'vue': 'vue/dist/vue.esm-bundler.js'
        }
    }
};
