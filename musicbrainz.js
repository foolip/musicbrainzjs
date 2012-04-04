// -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*-

'use strict';

function forEach(list, callback) {
  return Array.prototype.forEach.call(list, callback);
};

function map(list, callback) {
  return Array.prototype.map.call(list, callback);
};

function log(msg) {
  var dst = document.querySelector('pre');
  if (dst) {
    if (typeof msg == 'object')
      msg = JSON.stringify(msg, null, " ");
    dst.textContent += msg + '\n';
  }
}

function parseDocument(doc) {
  var elm = doc.querySelector('metadata > *');
  return parseElement(elm);
}

function parseElement(elm) {
  switch (elm.tagName) {
  case 'artist':
    return parseArtist(elm);
  case 'artist-credit':
    return parseArtistCredit(elm);
  case 'label':
    return parseLabel(elm);
  case 'label-info':
    return parseLabelInfo(elm);
  case 'medium':
    return parseMedium(elm);
  case 'recording':
    return parseRecording(elm);
  case 'release':
    return parseRelease(elm);
  case 'release-group':
    return parseReleaseGroup(elm);
  case 'track':
    return parseTrack(elm);
  case 'label-info-list':
  case 'medium-list':
  case 'recording-list':
  case 'release-list':
    return parseList(elm);
  }
  log('unknown element: "'+elm.tagName+'"');
}

function parseList(elm) {
  return map(elm.children, parseElement);
}

// Convert e.g. 'sort-name' to 'sortName'.
function toCamelCaps(str) {
  return str.replace(/[-]+([^-]?)/g, function(m, g) { return g.toUpperCase(); });
}

// Convert e.g. 'recording-list' to 'recordings
function toPlural(str) {
  return str.replace(/-list$/, 's');
}

function parseArtist(elm) {
  var artist = { id : elm.getAttribute('id') };
  var type = elm.getAttribute('type');
  if (type)
    artist.type = type;
  forEach(elm.children, function(elm) {
    var prop = elm.tagName;
    var val = elm.textContent;
    switch (prop) {
    case 'country':
    case 'gender':
    case 'life-span':
    case 'name':
    case 'sort-name':
      artist[toCamelCaps(prop)] = val;
      break;
    case 'recording-list':
    case 'release-list':
    case 'work-list':
      artist[toCamelCaps(prop)] = parseList(elm);
      break;
    default:
      log('unknown artist property: "'+prop+'"');
      break;
    }
  });
  return artist;
}

function parseArtistCredit(elm) {
  var credit = [];
  forEach(elm.children, function(elm) {
    if (elm.tagName != 'name-credit') {
      log('unknown artist-credit sub-element: "'+elm.tagName+'"');
      return;
    }
    var artist;
    var name;
    forEach(elm.children, function(elm) {
      switch(elm.tagName) {
      case 'name':
        name = elm.textContent;
        break;
      case 'artist':
        artist = parseArtist(elm);
        break;
      default:
        log('unknown name-credit sub-element: "'+elm.tagName+'"');
        break;
      }
    });
    if (artist) {
      if (name)
        artist.name = name;
      credit.push(artist);
    }
    if (elm.hasAttribute('joinphrase'))
      credit.push(elm.getAttribute('joinphrase'));
  });
  return credit;
}

function parseIsrcList(elm) {
  var isrcs = [];
  forEach(elm.children, function(elm) {
    if (elm.tagName == 'isrc' && elm.hasAttribute('id'))
      isrcs.push(elm.getAttribute('id'));
    else
      log('unknown isrc-list sub-element: "'+elm.tagName+'"');
  });
  return isrcs;
}

function parseLabel(elm) {
  var label = { id : elm.getAttribute('id') };
  forEach(elm.children, function(elm) {
    var prop = elm.tagName;
    var val = elm.textContent;
    switch (prop) {
    case 'name':
      label[prop] = val;
      break;
    default:
      log('unknown label property: "'+prop+'"');
      break;
    }
  });
  return label;
}

function parseLabelInfo(elm) {
  var info = {};
  forEach(elm.children, function(elm) {
    var prop = elm.tagName;
    var val = elm.textContent;
    switch (prop) {
    case 'catalog-number':
      info[toCamelCaps(prop)] = val;
      break;
    case 'label':
      info[prop] = parseElement(elm);
      break;
    default:
      log('unknown label-info property: "'+prop+'"');
      break;
    }
  });
  return info;
}

function parseMedium(elm) {
  var medium = {};
  forEach(elm.children, function(elm) {
    var prop = elm.tagName;
    var val = elm.textContent;
    switch (prop) {
    case 'format':
      medium[prop] = val;
      break;
    case 'position':
      medium[prop] = +val;
      break;
    case 'track-list':
      medium[toCamelCaps(prop)] = parseList(elm);
      break;
    default:
      log('unknown medium property: "'+prop+'"');
      break;
    }
  });
  return medium;
}

function parseRecording(elm) {
  var recording = { id : elm.getAttribute('id') };
  forEach(elm.children, function(elm) {
    var prop = elm.tagName;
    var val = elm.textContent;
    switch (prop) {
    case 'disambiguation':
    case 'title':
      recording[prop] = val;
      break;
    case 'length':
      recording.duration = +val/1000;
      break;
    case 'isrc-list':
      recording[toCamelCaps(prop)] = parseIsrcList(elm);
      break;
    default:
      log('unknown recording property: "'+prop+'"');
      break;
    }
  });
  return recording;
}

function parseRelease(elm) {
  var release = { id : elm.getAttribute('id') };
  forEach(elm.children, function(elm) {
    var prop = elm.tagName;
    var val = elm.textContent;
    switch (prop) {
    case 'asin':
    case 'barcode':
    case 'country':
    case 'date':
    case 'disambiguation':
    case 'status':
    case 'title':
    case 'quality':
      release[prop] = val;
      break;
    case 'artist-credit':
    case 'label-info-list':
    case 'medium-list':
    case 'release-group':
      release[toCamelCaps(prop)] = parseElement(elm);
      break;
    case 'text-representation':
      forEach(elm.children, function(elm) {
        var prop = elm.tagName;
        var val = elm.textContent;
        switch (prop) {
        case 'language':
        case 'script':
          release[prop] = val;
          break;
        default:
          log('unknown text-representation property: "'+prop+'"');
        }
      });
      break;
    default:
      log('unknown release property: "'+prop+'"');
      break;
    }
  });
  return release;
}

function parseReleaseGroup(elm) {
  return { id: elm.getAttribute('id'), type: elm.getAttribute('type') };
}

function parseTrack(elm) {
  var track = {};
  forEach(elm.children, function(elm) {
    var prop = elm.tagName;
    var val = elm.textContent;
    switch (prop) {
    case 'length':
      track.duration = +val/1000;
      break;
    case 'position':
      track[prop] = +val;
      break;
    case 'recording':
      track[prop] = parseElement(elm);
      break;
    default:
      log('unknown track property: "'+prop+'"');
      break;
    }
  });
  return track;
}

function request(url, onload, onerror) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.onreadystatechange = function() {
    if (this.readyState == 4) {
      switch (this.status) {
      case 200:
        log(this.responseText);
        onload(parseDocument(this.responseXML));
        break;
      default:
        var reason = this.status+' '+this.statusText;
        log(reason);
        if (onerror)
          onerror(reason);
        break;
      }
    }
  };
  log('requesting "'+url+'"');
  xhr.send();
}

function getRecordingsByArtist(artist, onload, onerror) {
  var url = 'http://musicbrainz.org/ws/2/recording?artist='+artist+'&limit=10&offset=130';
  request(url, onload, onerror);
}

var INC_RELS = [
  'artist-rels',
  'label-rels',
  'recording-rels',
  'release-rels',
  'release-group-rels',
  'url-rels',
  'work-rels'];

function getRecordingById(id, inc, onload, onerror) {
  var url = 'http://musicbrainz.org/ws/2/recording/'+id;
  if (inc && inc.length)
    url += '?inc='+inc.join('+');
  request(url, onload, onerror);
}

function getReleaseById(id, inc, onload, onerror) {
  var url = 'http://musicbrainz.org/ws/2/release/'+id;
  if (inc && inc.length)
    url += '?inc='+inc.join('+');
  request(url, onload, onerror);
}

function getArtistById(id, inc, onload, onerror) {
  var url = 'http://musicbrainz.org/ws/2/artist/'+id;
  if (inc && inc.length)
    url += '?inc='+inc.join('+');
  request(url, onload, onerror);
}

function search(type, terms, onload, onerror) {
  function escape(s) {
    // FIXME: is this over-escaping? Just escape "?
    return s.replace(/[\+\-\&\|\!\(\)\{\}\[\]\^\"\~\*\?\:]/g, function(x) { return '\\'+x; });
  }
  var query = Object.keys(terms).map(function(k) { return k+'~"'+escape(terms[k])+'"'; }).join(' ');
  log(query);
  var url = 'http://musicbrainz.org/ws/2/'+type+'/?limit=5&query='+encodeURIComponent(query);
  request(url, onload, onerror);
}

getReleaseById('16ba8f54-2638-4cf9-86f5-2396bc38ec5c', ['recordings', 'isrcs'], function(release) {
  log(release);
});

/*
search('release', { release: '聯手創作精選', artist: '周杰倫' }, function(releases) {
  log(releases);
  releases.forEach(function(release) {
    var artist = release.artistCredit.map(function(o) { return o.name ? o.name : o; }).join('');
    log(artist);
  });
});
*/

if (window.test) { (function() {
  var JAYID = 'a223958d-5c56-4b2c-a30a-87e357bc121b';

  var t = async_test('getArtistById');
  getArtistById(JAYID, null, function(artist) {
    t.step(function() {
      assert_equals(artist.sortName, 'Chou, Jay');
    });
    t.done();
  });
})();}
