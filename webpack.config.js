const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
    watch: true,
    entry: {
        index: './src/index/index.js'
    },
    mode: 'development',
    devServer: {
        open: true,
        //contentBase: path.join(__dirname, 'dist')
        publicPath: '/dist/',
        writeToDisk: true //avoir le dossier 'dist' sur l'ordinateur

    },
    devtool: 'inline-source-map',
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: path.resolve(__dirname, './src/template_index.html'),
            chunks: ['index']
        })
    ],
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"] //il faut d'abord que le css-loader se declenche, puis style-loader, mais l'ordre est inverse, donc style-loader est a placer en premier
            },
            {
                test: /\.html$/,
                use: ["html-loader"]
            },
            {
                test: /\.(glb)$/,
                use: {
                    loader: "file-loader",
                    options: {
                        name: "[name].[ext]",
                        outputPath: "3dmodel"
                    }
                }
            },            
        ]
    }
};