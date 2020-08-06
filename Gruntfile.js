module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt)

  grunt.loadNpmTasks('grunt-babel')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-compress')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-jshint')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-string-replace')

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ['dist', 'libre-scheduler-order-mgt-table-panel.zip', 'libre-scheduler-order-mgt-table-panel.tar.gz'],

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      src: ['Gruntfile.js', 'src/*.js']
    },

    copy: {
      src_to_dist: {
        cwd: 'src',
        expand: true,
        src: ['**/*', '!**/*.js', '!image/**/*'],
        dest: 'dist'
      },
      libs: {
        cwd: 'libs',
        expand: true,
        src: ['**.*'],
        dest: 'dist/libs',
        options: {
          process: content => content.replace(/(\'|")ion.rangeSlider(\'|")/g, '$1./ion.rangeSlider.min$2'), // eslint-disable-line
        }
      },
      pluginDef: {
        expand: true,
        src: ['plugin.json'],
        dest: 'dist'
      },
      readme: {
        expand: true,
        src: ['README.md', 'docs/**', 'LICENSE', 'MAINTAINERS'],
        dest: 'dist'
      }
    },
    'string-replace': {
      dist: {
        files: {
          'dist/README.md': 'dist/README.md'
        },
        options: {
          replacements: [
            {
              pattern: /docs\//g,
              replacement: 'public/plugins/libre-product-crud-table-panel/docs/'
            }
          ]
        }
      }
    },
    watch: {
      rebuild_all: {
        files: ['src/**/*', 'plugin.json'],
        tasks: ['default'],
        options: { spawn: false }
      }
    },

    babel: {
      options: {
        ignore: ['**/src/libs/*'],
        sourceMap: true,
        presets: ['es2015'],
        plugins: ['transform-es2015-modules-systemjs', 'transform-es2015-for-of']
      },
      dist: {
        files: [{
          cwd: 'src',
          expand: true,
          src: ['*.js'],
          dest: 'dist',
          ext: '.js'
        }]
      }
    },
    compress: {
      main: {
        options: {
          archive: 'libre-scheduler-order-mgt-table-panel.zip'
        },
        expand: true,
        cwd: 'dist/',
        src: ['**/*']
      },
      tar: {
        options: {
          archive: 'libre-scheduler-order-mgt-table-panel.tar.gz'
        },
        expand: true,
        cwd: 'dist/',
        src: ['**/*']
      }
    }
  })
  grunt.registerTask('default', [
    'copy:src_to_dist',
    'copy:libs',
    'copy:readme',
    'string-replace',
    'copy:pluginDef',
    'babel'])

  grunt.registerTask('build', [
    'clean',
    'default',
    'compress:main',
    'compress:tar'
  ])
}
