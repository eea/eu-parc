/**
 * @file
 * Watch changes to *.pcss.css files and compile them to CSS during development.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const changeOrAdded = require('./changeOrAdded');
const log = require('./log');

// Match only on .pcss.css files.
const fileMatch = './**/*.pcss.css';
// Ignore everything in node_modules
const watcher = chokidar.watch(fileMatch, {
  ignoreInitial: true,
  ignored: './node_modules/**'
});

const unlinkHandler = (err) => {
  if (err) {
    log(err);
  }
};

// Watch for filesystem changes.
watcher
  .on('add', changeOrAdded)
  .on('change', changeOrAdded)
  .on('unlink', (filePath) => {
    const fileName = filePath.slice(0, -9);
    fs.stat(`${fileName}.css`, () => {
      fs.unlink(`${fileName}.css`, unlinkHandler);
    });
  })
  .on('ready', () => log(`Watching .pcss files in current theme for changes.`));
