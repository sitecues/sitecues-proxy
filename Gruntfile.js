// This module defines the project's build system.

'use strict';

const configFiles = [
    'Gruntfile.js',
    'config/**/*.js'
];
const testFiles = [
    'test/**/*.js'
];
const appFiles = [
    // The "main" file as defined in package.json.
    '<%= pkg.main %>',
    // CLI modules.
    'bin/**/*.js',
    // Primary source code modules.
    'lib/**/*.js'
];
const jsLintDirectives = {
    // Be quiet about whitespace, JSCS is smarter.
    white  : true,
    // Max line length in characters.
    maxlen : 80,
    node   : true
};

const setupTaskRunner = (grunt) => {
    // Task configuration.
    grunt.initConfig({
        // Getting the Node app configuration as an object,
        // which can be used internally.
        pkg : grunt.file.readJSON('package.json'),

        // Clean configuration, used to wipe out temporary build data,
        // for more robust and reliable builds.
        clean : {
            // Enable this to do a dry run (logs but no actual changes)
            // options : {
            //     'no-write': true
            // },
            normal : {
                src : [
                    // Test results.
                    'report',
                    // App logs.
                    'log'
                ]
            }
        },

        // JSONLint configuration, used for linting config files.
        jsonlint : {
            normal : {
                src : [
                    'package.json',
                    'config/**/*.json',
                    'test/**/*.json',
                    'lib/**/*.json'
                ]
            }
        },

        // JSHint configuration, used for linting the library...
        jshint : {
            // Task local options, these override JSHint defaults and are
            // inherited by all targets in this task.
            options : {
                // Look for config near each linted file
                jshintrc : true
            },
            config : {
                // This target knows how to lint the build system.
                files : {
                    src : configFiles
                }
            },
            tests : {
                // This target knows how to lint the app's tests.
                files : {
                    src : testFiles
                }
            },
            app : {
                // This target knows how to lint the primary app.
                files : {
                    src : appFiles
                }
            }
        },

        // JSCS configuration, used for enforcing coding style requirements.
        jscs : {
            options : {
                // Look for config near each linted file.
                config : true
            },
            config : {
                files : {
                    src : configFiles
                }
            },
            tests : {
                files : {
                    src : testFiles
                }
            },
            app : {
                files : {
                    src : appFiles
                }
            }
        },

        // JSLint configuration, used for advice on code style.
        jslint : {
            config : {
                files : {
                    src : configFiles
                },
                directives : jsLintDirectives
            },
            tests : {
                files : {
                    src : testFiles
                },
                directives : jsLintDirectives
            },
            app : {
                files : {
                    src : appFiles
                },
                directives : jsLintDirectives
            }
        },

        // Intern configuration, used for the app's automated tests.
        intern : {
            options : {
                // Test framework config file path.
                config  : 'config/intern',
                // Whether to run in Node or the browser. Proxy runs in Node.
                runType : 'client'
            },
            normal : {
                // Empty target because it inherits task local options.
            }
        },

        // Watch configuration, used for automatically executing
        // tasks when saving files in the library.
        watch : {
            files : ['**.*'],
            tasks : ['lint']
        }
    });
    // Load the plugin that provides the "clean" task.
    grunt.loadNpmTasks('grunt-contrib-clean');
    // Load the plugin that provides the "jsonlint" task.
    grunt.loadNpmTasks('grunt-jsonlint');
    // Load the plugin that provides the "jshint" task.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    // Load the plugin that provides the "jscs" task.
    grunt.loadNpmTasks('grunt-jscs');
    // Load the plugin that provides the "jslint" task.
    grunt.loadNpmTasks('grunt-jslint');
    // Load the plugin that provides the "intern" task.
    grunt.loadNpmTasks('intern');
    // Load the plugin that provides the "watch" task.
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Make a new task called 'lint'.
    grunt.registerTask('lint', ['jsonlint', 'jshint', 'jscs']);
    // Make a new task called 'opinion'.
    grunt.registerTask('opinion', ['lint', 'jslint']);
    // Make a new task called 'test'.
    grunt.registerTask('test', ['intern:normal']);

    // Default task, will run if no task is specified.
    grunt.registerTask('default', ['clean', 'lint', 'test']);
};

module.exports = setupTaskRunner;
