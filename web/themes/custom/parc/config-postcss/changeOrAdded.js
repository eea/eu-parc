const fse = require('fs-extra');
const log = require('./log');
const compile = require('./compile');

module.exports = (filePath) => {
  log(`'${filePath}' is being processed.`);

  // Transform the file.
  compile(filePath, function write(code) {
    if (!filePath.startsWith('./')) {
      filePath = './' + filePath;
    }

    let cssFilePath;

    // Handle components directory - keep files in same location
    if (filePath.startsWith('./components/')) {
      // Remove leading './' and '.pcss.css' extension
      cssFilePath = filePath.slice(2, -9) + '.css';
    }
    // Ex file ./folder/folder/file-name.scss.css
    // Slice from first symbols and last 9
    else if (filePath.startsWith('./dev/pcss')) {
      var fileName = filePath.slice(10, -9);
      cssFilePath = 'css' + fileName + '.css';
    } else if (filePath.startsWith('./templates')) {
      var fileName = filePath.slice(11, -9);
      cssFilePath = 'css' + fileName + '.css';
    } else {
      var fileName = filePath.slice(1, -9);
      cssFilePath = 'css' + fileName + '.css';
    }

    fse.outputFile(cssFilePath, code)
      .then(() => {
        log(`'${filePath}' is finished.`);
      });
  });
};
