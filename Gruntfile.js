module.exports = function(grunt) {

require('load-grunt-tasks')(grunt); // npm install --save-dev load-grunt-tasks

grunt.initConfig({
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

grunt.registerTask('default', ['babel']);

};