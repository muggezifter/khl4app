module.exports = function(grunt) {

require('load-grunt-tasks')(grunt); // npm install --save-dev load-grunt-tasks

grunt.initConfig({
    watch: {
        scripts: {
            files: '**/*.jsx',
            tasks: ['babel'],
            options: {
                interrupt: true,
            },
        },
    },
    babel: {
        options: {
            sourceMap: true,
            presets: ['es2015','react']
        },
        dist: {
            files: {
                'www/js/app.js': 'www/src/app.jsx'
            }
        }
    }

});

grunt.loadNpmTasks('grunt-contrib-watch');

grunt.registerTask('default', ['watch']);

};