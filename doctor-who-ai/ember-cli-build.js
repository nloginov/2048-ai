'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const gitRev = require('git-rev-sync');
const mergeTrees = require('broccoli-merge-trees');
const UnwatchedDir = require('broccoli-source').UnwatchedDir;

const { buildWorkerTrees } = require('./config/build/workers');

const { EMBROIDER, CONCAT_STATS } = process.env;

module.exports = function(defaults) {

  let environment = EmberApp.env();
  let isProduction = environment === 'production';

  let version = gitRev.short();

  let env = {

    isProduction,
    isTest: environment === 'test',
    version,
    CONCAT_STATS,
  }
  let app = new EmberApp(defaults, {
    hinting: false,
    autoprefixer: {
      enabled: false,
      sourcemaps: false,
    },
    sourcemaps: {
      enabled: false,
    },
    fingerprint: {
      // need stable URL for bookmarklet to load
      enabled: false,
    }
  });

  app.trees.public = new UnwatchedDir('public');

  let additionalTrees = [...buildWorkerTrees(env)]

  return mergeTrees([app.toTree(), ...additionalTrees]);
};
