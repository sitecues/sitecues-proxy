// This module defines the project's build system.

'use strict';

function taskRunner(grunt) {

    // Task configuration.
    grunt.initConfig(
        {
            // Getting the full node app configuration as an object
            // which can be used internally.
            pkg : grunt.file.readJSON('package.json'),

            // Clean configuration, used to wipe out temporary build data,
            // for more robust and reliable builds.
            clean : {
                // options : {
                //     'no-write': true  // dry run (logs but no actual changes)
                // },
                normal : {
                    src : [
                        'report',  // directory created by the test system
                        'log'      // directory created by the proxy at runtime
                    ]
                }
            },

            // JSONLint configuration, used for linting config files.
            jsonlint : {
                normal : {
                    // be explicit, globbing too much hurts build performance.
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
                options : {
                    // Options here override JSHint defaults and are 'task local',
                    // meaning all targets in this task inherit these options...
                    jshintrc : true  // look for config near each linted file
                },
                config : {
                    // This target knows how to lint the build system.
                    files : {
                        src : [
                            'Gruntfile.js',   // build system
                            'config/**/*.js'
                        ]
                    }
                },
                tests : {
                    // This target knows how to lint the app's tests.
                    files : {
                        src : [
                            'test/**/*.js'
                        ]
                    }
                },
                app : {
                    // This target knows how to lint the primary app.
                    files : {
                        src : [
                            '<%= pkg.main %>',  // "main" defined in package.json
                            'bin/**/*.js',      // CLI modules
                            'lib/**/*.js'       // primary source files
                        ]
                    }
                }
            },

            // JSCS configuration, used for enforcing coding style requirements.
            jscs : {
                options : {
                    config : true  // look for config near each linted file
                },
                config : {
                    files : {
                        src : [
                            'Gruntfile.js',
                            'config/**/*.js'
                        ]
                    }
                },
                tests : {
                    options : {
                        disallowKeywords : null  // tests are allowed to use 'with'
                    },
                    files : {
                        src : [
                            'test/**/*.js'
                        ]
                    }
                },
                app : {
                    files : {
                        src : [
                            '<%= pkg.main %>',  // "main" defined in package.json
                            'bin/**/*.js',      // CLI modules
                            'lib/**/*.js'       // primary source files
                        ]
                    }
                }
            },

            // JSLint configuration, used for advice on code style.
            jslint : {
                options : {
                    // Version of JSLint to use.
                    edition : 'latest'  // most current by default
                },
                config : {
                    files : {
                        src : [
                            'Gruntfile.js',
                            'config/**/*.js'
                        ]
                    }
                },
                tests : {
                    files : {
                        src : [
                            'test/**/*.js'
                        ]
                    }
                },
                app : {
                    files : {
                        src : [
                            '<%= pkg.main %>',  // "main" defined in package.json
                            'bin/**/*.js',      // CLI modules
                            'lib/**/*.js'       // primary source files
                        ]
                    },
                    directives : {
                        white   : true,  // Be quiet about whitespace, we have JSCS.
                        maxlen  : 80     // Max line length in characters.
                    }
                }
            },

            // Selenium configuration, used for the app's functional testing.
            selenium_start : {
                // NOTE: This server is destroyed when grunt exits.
                // You MUST chain this with other tasks.
                options : {
                    port : 4447
                }
            },

            // Intern configuration, used for the app's automated tests.
            intern : {
                options : {
                    config  : 'config/intern',  // test framework config
                    runType : 'client'          // unit testing mode
                },
                normal : {
                    // empty target because it inherits task local options
                },
                cloud : {
                    options : {
                        config : 'config/intern-cloud'
                    }
                }
            },

            // Selenium configuration, used for the app's functional testing.
            selenium_stop : {
                options : { }
            },

            // Watch configuration, used for automatically executing
            // tasks when saving files in the library.
            watch : {
                files : ['**.*'],
                tasks : ['lint']
            }
        }
    );
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
    // Load the plugin that provides the "start_selenium" and "start_selenium" tasks.
    grunt.loadNpmTasks('grunt-selenium-webdriver');
    // Load the plugin that provides the "intern" task.
    grunt.loadNpmTasks('intern');
    // Load the plugin that provides the "watch" task.
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Make a new task called 'lint'.
    grunt.registerTask('lint', ['jsonlint', 'jshint', 'jscs']);
    // Make a new task called 'opinion'.
    grunt.registerTask('opinion', ['lint', 'jslint']);
    // Make a new task called 'test'.
    grunt.registerTask('test', ['selenium_start', 'intern:normal']);

    // Default task, will run if no task is specified.
    grunt.registerTask('default', ['clean', 'lint', 'test']);

}

module.exports = taskRunner;
