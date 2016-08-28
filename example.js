var mtif = require('./index.js');

var stream = mtif('tests/fixtures/mtif.txt');

stream.on('error', function (err) {
  console.log('errr')
  console.log(err);
  // 'err' contains error object
});

stream.on('entry', function (entry) {
  // 'line' contains the current line without the trailing newline character.
  console.log(entry);
});

stream.on('end', function () {
  // All lines are read, file is closed now.
});