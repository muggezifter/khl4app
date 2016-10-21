module.exports = function(grunt) {

require('load-grunt-tasks')(grunt); // npm install --save-dev load-grunt-tasks

grunt.initConfig({
    watch: {
        scripts: {
            files: '**/*.jsx',
            tasks: ['babel'],
            options: {
                interrupt: true,
            }
        },
        styles: {
            files: '**/*.scss',
            tasks: ['sass'],
            options: {
                interrupt: true,
            }

        }
    },
    babel: {
        options: {
            sourceMap: true,
            presets: ['es2015','react']
        },
        dist: {
            files: {
                'www/js/app.js': 'src/app.jsx'
            }
        }
    },
    sass: {
        options: {
                style: 'expanded',
                compass: true
        },
        dist: {
            files: {
                'www/css/app.css': 'src/scss/app.scss'
            }
        }

    }
});

grunt.loadNpmTasks('grunt-contrib-watch');

grunt.registerTask('default', ['watch']);

};