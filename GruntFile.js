module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        banner:'/*!\n * Copyright (c) Christopher Keefer, <%= grunt.template.today("yyyy") %>.\n' +
            ' * <%= pkg.name %>: V<%= pkg.version %>.\n' +
            ' * Compiled: <%= grunt.template.today("yyyy-mm-dd") %> \n */\n\n',
        uglify:{
            options:{
                banner:'<%= banner %>',
                report:'min'
            },
            hup:{
                options:{
                    sourceMappingURL:'hup.min.map',
                    sourceMapPrefix:2,
                    sourceMap:'dist/hup.min.map'
                },
                src:'hup.js',
                dest:'dist/hup.min.js'
            }
        }
    });

    // Load plugins for each task
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Tasks
    grunt.registerTask('default', ['uglify']);
};
