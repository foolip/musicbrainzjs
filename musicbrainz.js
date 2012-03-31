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
