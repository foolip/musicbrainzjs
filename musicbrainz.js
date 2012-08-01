// -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*-

'use strict';

var musicbrainz = function() {
  var api = { debug: true, throttle: true };

  function assert(pred, msg) {
    if (!pred) {
      throw msg;
    }
  }

  function log(msg) {
    if (api.debug) {
      console.log(msg);
    }
  }

  function each(list, callback) {
    return Array.prototype.forEach.call(list, callback);
  };

  // Convert e.g. 'sort-name' to 'sortName'.
  function toCamelCase(str) {
    return str.replace(/[-:]+([^-:]?)/g, function(m, g) { return g.toUpperCase(); });
  }

  // transform an XML element into a name-value {n: 'name', v: ... }
  // object.
  function transform(elm) {
    var name = toCamelCase(elm.tagName);
    var value;

    if (elm.attributes.length == 0 && elm.children.length == 0) {
      // no attributes or child elements, use the text content
      value = elm.textContent;
    } else {
      value = {};
      each(elm.attributes, function(attr) {
        var name = toCamelCase(attr.name);
        assert(!(name in value), 'duplicate attribute name: '+name);
        value[name] = attr.value;
      });
      var isList = name.substr(name.length - 4) == 'List';
      var listName = isList ? name.substr(0, name.length - 4) : undefined;
      each(elm.children, function(child) {
        var nv = transform(child);
        if ((isList && nv.n == listName) ||
            nv.n == 'relationList' ||
            name == 'artistCredit') {
          if (!(nv.n in value)) {
            value[nv.n] = [nv.v];
          } else {
            value[nv.n].push(nv.v);
          }
        } else {
          assert(!(nv.n in value), 'duplicate element name: '+nv.n);
          value[nv.n] = nv.v;
        }
      });
    }

    // post-process to simplify various structures

    if (isList) {
      // drop the container with its attributes
      value = value[listName] || [];
    }

    if (name == 'artistCredit') {
      // transform to array of artists and join phrases
      var credit = [];
      each(value.nameCredit, function(c) {
        credit.push(c.artist);
        if ('joinphrase' in c) {
          credit.push(c.joinphrase);
        }
      });
      value = credit;
    }

    if (name == 'isrc') {
      value = value.id;
    }

    if (name == 'length') {
      value = +value/1000;
    }

    return { n: name, v: value };
  }

  function request(url, onload, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onreadystatechange = function() {
      if (this.readyState == 4) {
        switch (this.status) {
        case 200:
          log(this.responseText);
          onload(transform(this.responseXML.querySelector('metadata > *')).v);
          break;
        default:
          var reason = this.status+' '+this.statusText;
          if (onerror) {
            onerror(reason);
          } else {
            log('unhandled load error for '+url);
          }
          break;
        }
      }
    };
    xhr.send();
  }

  function getEntityById(type, id, inc, onload, onerror) {
    var url = 'http://musicbrainz.org/ws/2/'+type+'/'+id;
    if (inc && inc.length)
      url += '?inc='+inc.join('+');
    request(url, onload, onerror);
  }

  function queryEntity(type, query, onload, onerror) {
    if (typeof query != 'string') {
      // map something like { artist: 'Eason Chan', title: 'Solidays' } to a Lucene query
      var query = Object.keys(query).map(function(key) {
        var value = query[key];
        if (key == 'title') {
          // use no key at all for the title itself
          return value;
        }
        return key+':"'+value.replace('"', '')+'"';
      }).join(' ');
    }
    log(query);
    var url = 'http://musicbrainz.org/ws/2/'+type+'?limit=5&query='+encodeURIComponent(query);
    request(url, onload, onerror);
  }

  each(['artist', 'label', 'recording', 'release', 'release-group', 'work'], function(type) {
    api[toCamelCase('get-'+type+'-by-id')] = function(id, inc, onload, onerror) { getEntityById(type, id, inc, onload, onerror); }
    api[toCamelCase('query-'+type)] = function(query, onload, onerror) { queryEntity(type, query, onload, onerror); }
  });

  return api;
}();
