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
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: path.resolve(__dirname, './src/template_index.html'),
            chunks: ['index']
        })
    ]
};