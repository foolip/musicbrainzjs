// -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*-

'use strict';

HTMLCollection.prototype.forEach = function() {
  return Array.prototype.forEach.apply(this, arguments);
};

HTMLCollection.prototype.map = function() {
  return Array.prototype.map.apply(this, arguments);
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
  case 'recording-list':
    return parseList(elm);
  case 'recording':
    return parseRecording(elm);
  }
  log('unknown element: "'+elm.tagName+'"');
}

function parseList(elm) {
  return elm.children.map(parseElement);
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
  elm.children.forEach(function(elm) {
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
      artist[toPlural(prop)] = parseList(elm);
      break;
    default:
      log('unknown artist property: "'+prop+'"');
      break;
    }
  });
  return artist;
}

function parseRecording(elm) {
  var recording = { id : elm.getAttribute('id') };
  elm.children.forEach(function(elm) {
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
    default:
      log('unknown recording property: "'+prop+'"');
      break;
    }
  });
  return recording;
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
  if (!inc)
    inc = INC_RELS; // FIXME
  if (inc.length)
    url += '?inc='+inc.join('+');
  request(url, onload, onerror);
}

function getArtistById(id, inc, onload, onerror) {
  var url = 'http://musicbrainz.org/ws/2/artist/'+id;
  if (!inc)
    inc = INC_RELS;//.concat(['recordings', 'releases', 'release-groups', 'works']);
  if (inc.length)
    url += '?inc='+inc.join('+');
  request(url, onload, onerror);
}

/*
getRecordingsByArtist('a223958d-5c56-4b2c-a30a-87e357bc121b', function(recordings) {
  log(recordings);
  getRecordingById(recordings[0].id, null, function(recording) {
    log(recording);
  });
});
*/

var JAYID = 'a223958d-5c56-4b2c-a30a-87e357bc121b';
var EASONID = '86119d30-d930-4e65-a97a-e31e22388166';
var NULLID = '00000000-0000-0000-0000-000000000000';
var ONESID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

// convert a 36-byte UUID to a 16-byte octet string
function uuidtobytes(uuid) {
  return uuid.replace(/([0-9a-f]{2})-?/g, function(hex) { return String.fromCharCode(parseInt(hex, 16)); });
}

// convert a 16-byte octet string to a 36-byte UUID
function bytestouuid(bytes) {
  // xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (8+4+4+4+12)
  var i, b, uuid = '';
  for (i = 0; i < 16; i++)
  {
    b = bytes.charCodeAt(i);
    uuid += (b < 16 ? '0' : '') + b.toString(16) + (i > 2 && i < 10 && i % 2 == 1 ? '-' : '');
  }
  return uuid;
}

// convert a 36-byte UUID to a 24-byte base64 string
function uuidtobase64(uuid) {
  return btoa(uuidtobytes(uuid));
}

// convert a 24-byte base64 string to a 36-byte UUID
function base64touuid(base64) {
  return bytestouuid(atob(base64));
}

// convert a 36-byte UUID to an 8-byte unicode string
function uuidtounicode(uuid) {
  return uuid.replace(/([0-9a-f]{4})-?/g, function(hex) { return String.fromCharCode(parseInt(hex, 16)); });
}

// convert an 8-byte unicode string to a 36-byte UUID
function unicodetouuid(uni) {
  // xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (8+4+4+4+12)
  var i, hex, uuid = '';
  for (i = 0; i < 8; i++)
  {
    hex = uni.charCodeAt(i).toString(16);
    hex = Array(5 - hex.length).join('0') + hex;
    uuid += hex + (i > 0 && i < 5 ? '-' : '');
  }
  return uuid;
}

// convert a 36-byte UUID to a size-16 array of octets [0,255]
function uuidtoarray(uuid) {
  return uuid.match(/[0-9a-f]{2}/g).map(function(hex) { return parseInt(hex, 16); });
}

/** Convert numbers between arbitrary bases.
 *
 * @param number A number represented as an array of integers in the
 *               range [0, srcbase-1].
 * @param frombase The source base in the range [0, Inf].
 * @param tobase The destination base in the range [0, Inf].
 * @return A number represented as an array of integers in the
 *         range [0, dstbase-1].
 */
function baseconv(src, srcbase, dstbase) {
  var dst = '';
  var acc = 0; // value accumulator
  var range = 1; // range (max value) of acc
  var i = 0;
  while (i < src.length) {
    while (range < dstbase && i < src.length) {
      acc = (acc << 8) + src[i++];
      range = range << 8;
    }
    dst.push(acc % dstbase);
    acc = (acc / dstbase) << 0;
    range = (range / dstbase) << 0;
  }
  return dst;
}

//log(baseconv([1, 0], 10, 3));
//log('done');

// CJK 4E00-9FFF, 0x9FCC being the last used code point
// 14.35 bits per code point => 128 bits in 9 chars?

var CJK_LOW = 0x4E00;
var CJK_HIGH = 0x9FCC;
var CJK_RANGE = CJK_HIGH - CJK_LOW + 1;
log('CJK_RANGE: '+CJK_RANGE);

function uuidtocjk(uuid) {
  log('enter uuidtocjk');
  var octets = uuidtoarray(uuid);
  var cjk = '';
  var acc = 0; // value accumulator
  //log('acc: '+acc);
  var range = 1; // range (max value) of acc
  //log('range: '+range);
  var i = 0;
  while (i < octets.length) {
    //log('ACCUMULATE');
    while (range < CJK_RANGE && i < octets.length) {
      acc = (acc << 8) + octets[i++];
      //log('acc: '+acc);
      range = range << 8;
      //log('range: '+range);
    }
    //log('FLUSH');
    var out = acc % CJK_RANGE;
    log('out: '+out);
    cjk += String.fromCharCode(CJK_LOW + out);
    acc = (acc / CJK_RANGE) << 0;
    //log('acc: '+acc);
    range = (range / CJK_RANGE) << 0;
    //log('range: '+range);
  }
  //log('DONE');
  return cjk;
}

function cjktouuid(cjk) {
  log('enter cjktouuid');
  var codes = cjk.split('').map(function(c) { return c.charCodeAt(0) - CJK_LOW; });
  var octets = [];
  var range = 1;
  var i = 0;
  while (i < codes.length) {
    var code = codes[i];
    log('code: '+code);
    octets.push(code & 0xff);
    while (range < CJK_RANGE) {
      //acc = (acc << 8) + octets[i++];
      range = range << 8;
    }
    //acc = (acc / CJK_RANGE) << 0;
    range = (range / CJK_RANGE) << 0;
    break;
  }
  return octets.map(function(o) { return o.toString(16); }).join('');
}

var orig = EASONID;
var encd = uuidtocjk(orig);
var decd = cjktouuid(encd);
log(orig);
log(encd.length + ': '+encd);
log(decd);

/*
for (var c=0; c < 65536; c++) {
  var s = String.fromCharCode(c);
  if (s.charCodeAt(0) != c)
    log('not safe: '+c);
}
log('done');
*/

/*
getArtistById(JAYID, null, function(artist) {
  log(artist);
});

localStorage.clear();

var str = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^^&*()_+{}[];<>.,/?<>`~/*-+=-$#@!';
var i = 0;
while (true) {
  try {
    localStorage[i++] = str;
    if (i % 1000 == 0)
      log('stored '+i+' strings of length '+str.length);
  } catch (e) {
    log('stored '+i+' strings of length '+str.length);
    break;
  }
}
*/
