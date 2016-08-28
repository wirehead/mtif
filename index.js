var LineByLineReader = require('line-by-line'),
    events = require('events');

// https://movabletype.org/documentation/appendices/import-export-format.html

function parseMtifDate(date) {
  var dateBits = date.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2}) ?(AM|PM)?/);
  var hour = dateBits[4];
  if (dateBits[7] === 'PM') {
    hour = parseInt(hour) + 12;
  }
  return new Date(dateBits[3], dateBits[1]-1, dateBits[2], hour, dateBits[5], dateBits[6]);
}

function BreakIntoEntries(stream) {
  var ee = new events.EventEmitter();
  var entry = '';
  stream.on('error', function(err) {
    ee.emit('error', err);
  });
  stream.on('line', function(line) {
    if (line === '--------') {
      ee.emit('entry', entry);
      entry = '';
    } else {
      entry = entry + line + '\n';
    }    
  });
  stream.on('end', function() {
    ee.emit('end');
  });

  return ee;
}

function BreakIntoSections(stream) {
  var ee = new events.EventEmitter();
  stream.on('error', function(err) {
    ee.emit('error', err);
  });
  stream.on('entry', function(section) {
    var sections = section.split('-----');
    sections.forEach(function(value, index, array) {
      if (value !== '\n') {
        ee.emit('section', value)
      }
    })
    ee.emit('entryEnd');
  });
  stream.on('end', function() {
    ee.emit('end');
  });

  return ee;
}

function ParseMultiLine(stream) {
  var ee = new events.EventEmitter();
  stream.on('error', function(err) {
    ee.emit('error', err);
  });
  stream.on('section', function(section) {
    if (section.match(/^BODY:\n/mi)) {
      return ee.emit('body', section.replace(/^BODY:\n/mi,''))
    }
    if (section.match(/^EXCERPT:\n/mi)) {
      return ee.emit('excerpt', section.replace(/^EXCERPT:\n/mi,''))
    }
    if (section.match(/^COMMENT:\n/mi)) {
      return ee.emit('comment', section.replace(/^COMMENT:\n/mi,''))
    }
    if (section.match(/^PING:\n/mi)) {
      return ee.emit('ping', section.replace(/^PING:\n/mi,''))
    }
    if (section.match(/^EXTENDED BODY:\n/mi)) {
      return ee.emit('extendedBody', section.replace(/^EXTENDED BODY:\n/mi,''))
    }
    if (section.match(/^KEYWORDS:\n/mi)) {
      return ee.emit('keywords', section.replace(/^KEYWORDS:\n/mi,''))
    }
    ee.emit('section',section)
  });
  stream.on('entryEnd', function() {
    ee.emit('entryEnd');
  });
  stream.on('end', function() {
    ee.emit('end');
  });

  return ee;
}

function ParseSingleLine(stream) {
  var ee = new events.EventEmitter();
  stream.on('error', function(err) {
    ee.emit('error', err);
  });
  stream.on('body', function(section) {
    ee.emit('body', section.trim());
  });
  stream.on('excerpt', function(section) {
    ee.emit('excerpt', section.trim());
  });
  stream.on('comment', function(section) {
    var comment = {};
    var author = section.match(/^AUTHOR: (.+)\n/mi);
    section = section.replace(/^AUTHOR:.*\n/mi,'');
    if (author) {
      comment.author = author[1];
    }
    var date = section.match(/^DATE: (.+)\n/mi);
    section = section.replace(/^DATE:.*\n/mi,'');
    if (date) {
      comment.date = parseMtifDate(date[1]);
    }
    var email = section.match(/^EMAIL: (.+)\n/mi);
    section = section.replace(/^EMAIL:.*\n/mi,'');
    if (email) {
      comment.email = email[1];
    }
    var url = section.match(/^URL: (.+)\n/mi);
    section = section.replace(/^URL:.*\n/mi,'');
    if (url) {
      comment.url = url[1];
    }
    var ip = section.match(/^IP: (.+)\n/mi);
    section = section.replace(/^IP:.*\n/mi,'');
    if (ip) {
      comment.ip = ip[1];
    }
    comment.text = section.trim();
    ee.emit('comment', comment);
  });
  stream.on('ping', function(section) {
    var ping = {};
    var title = section.match(/^TITLE: (.+)\n/mi);
    section = section.replace(/^TITLE:.*\n/mi,'');
    if (title) {
      ping.title = title[1];
    }
    var date = section.match(/^DATE: (.+)\n/mi);
    section = section.replace(/^DATE:.*\n/mi,'');
    if (date) {
      ping.date = parseMtifDate(date[1]);
    }
    var blogName = section.match(/^BLOG NAME: (.+)\n/mi);
    section = section.replace(/^BLOG NAME:.*\n/mi,'');
    if (blogName) {
      ping.blogName = blogName[1];
    }
    var url = section.match(/^URL: (.+)\n/mi);
    section = section.replace(/^URL:.*\n/mi,'');
    if (url) {
      ping.url = url[1];
    }
    var ip = section.match(/^IP: (.+)\n/mi);
    section = section.replace(/^IP:.*\n/mi,'');
    if (ip) {
      ping.ip = ip[1];
    }
    ee.emit('ping', ping);
  });
  stream.on('extendedBody', function(section) {
    ee.emit('extendedBody', section.trim());
  });
  stream.on('keywords', function(keywords) {
    ee.emit('keywords', keywords.trim().split(', '));
  });
  stream.on('entryEnd', function() {
    ee.emit('entryEnd');
  });
  stream.on('section', function(section) {
    var lines = section.split('\n');
    lines = lines.map(function(line, index, arr) {
      return line.split(': ');
    });
    var data = {
      category: []
    };
    lines.forEach(function(line, index, arr) {
      if (line[0] === 'TITLE') {
        data.title = line[1];
      }
      if (line[0] === 'BASENAME') {
        data.baseName = line[1];
      }
      if (line[0] === 'AUTHOR') {
        data.author = line[1];
      }
      if (line[0] === 'AUTHOR EMAIL') {
        data.authorEmail = line[1];
      }
      if (line[0] === 'DATE') {
        data.date = parseMtifDate(line[1]);
      }
      if (line[0] === 'STATUS') {
        data.status = line[1];
      }
      if (line[0] === 'ALLOW COMMENTS') {
        data.allowComments = line[1];
      }
      if (line[0] === 'ALLOW PINGS') {
        data.allowPings = line[1];
      }
      if (line[0] === 'CONVERT BREAKS') {
        data.convertBreaks = line[1];
      }
      if (line[0] === 'NO ENTRY') {
        data.noEntry = line[1];
      }
      if (line[0] === 'UNIQUE URL') {
        data.uniqueUrl = line[1];
      }
      if (line[0] === 'CATEGORY') {
        data.category.push(line[1]);
      }
      if (line[0] === 'PRIMARY CATEGORY') {
        data.primaryCategory = line[1];
        data.category.push(line[1]);
      }
      if (line[0] === 'TAGS') {
        data.tags = line[1].split(',')
      }
    })
    ee.emit('data', data);
  });
  stream.on('end', function() {
    ee.emit('end');
  });

  return ee;
}

function ParseEntries(stream) {
  var ee = new events.EventEmitter();
  var entry = {
    comments: [],
    pings: []
  };
  stream.on('error', function(err) {
    ee.emit('error', err);
  });
  stream.on('body', function(section) {
    if (section) {
      entry.body = section;
    }
  });
  stream.on('excerpt', function(section) {
    if (section) {
      entry.excerpt = section;
    }
  });
  stream.on('keywords', function(keywords) {
    if (keywords) {
      entry.keywords = keywords;
    }
  });
  stream.on('comment', function(section) {
    if (section) {
      entry.comments.push(section);
    }
  });
  stream.on('ping', function(section) {
    if (section) {
      entry.pings.push(section);
    }
  });
  stream.on('extendedBody', function(section) {
    if (section) {
      entry.extendedBody = section;
    }
  });
  stream.on('data', function(section) {
    entry.data = section;
  });
  stream.on('entryEnd', function() {
    ee.emit('entry', entry);
    entry = {
      comments: [],
      pings: []
    };
  });
  stream.on('end', function() {
    ee.emit('end');
  });

  return ee;
}

module.exports = exports = function(path) {
  lr = new LineByLineReader(path);
  var stream = ParseEntries(ParseSingleLine(ParseMultiLine(BreakIntoSections(BreakIntoEntries(lr)))));
  return stream;
}