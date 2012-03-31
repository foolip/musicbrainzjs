// -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*-

'use strict';

/** Convert a UUID to an array of 16 octets [0,255]. */
function uuidtooctets(uuid) {
  return uuid.match(/[0-9a-f]{2}/g).map(function(hex) { return parseInt(hex, 16); });
}

/** Convert an array of 16 octets [0,255] to a UUID. */
function octetstouuid(octets) {
  // xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (8+4+4+4+12)
  var i, o, uuid = '';
  for (i = 0; i < 16; i++)
  {
    o = octets[i];
    uuid += (o < 16 ? '0' : '') + o.toString(16) + (i > 2 && i < 10 && i % 2 == 1 ? '-' : '');
  }
  return uuid;
}

/** Convert a UUID to a length-22 base64 string.
 *
 * The trailing '==' is not included since the number of bytes is
 * known (16).
 */
function uuidtobase64(uuid) {
  return btoa(uuidtooctets(uuid).map(function(o) { return String.fromCharCode(o); }).join('')).substr(0,22);
}

/** Convert a length-22 base64 string to a UUID. */
function base64touuid(base64) {
  return octetstouuid(atob(base64).split('').map(function(c) { return c.charCodeAt(0); }));
}

if (test) { (function() {
  var JAYID = 'a223958d-5c56-4b2c-a30a-87e357bc121b';
  var EASONID = '86119d30-d930-4e65-a97a-e31e22388166';
  var MAYID = 'e73ed332-bbde-4d69-87a9-250627ae0e29';
  var uuids = [JAYID, EASONID, MAYID];

  test(function() {
    uuids.forEach(function(uuid) {
      assert_equals(uuid.length, 36);
      var octets = uuidtooctets(uuid);
      assert_equals(octets.length, 16, 'uuidtooctets');
      octets.forEach(function(octet) {
        assert_true(octet >= 0 && octet <= 255);
      });
      assert_equals(octetstouuid(octets), uuid, 'octetstouuid');
    });
  }, 'UUID as octets');

  test(function() {
    uuids.forEach(function(uuid) {
      assert_equals(uuid.length, 36);
      var base64 = uuidtobase64(uuid);
      assert_equals(base64.length, 22, 'uuidtobase64');
      assert_equals(base64touuid(base64), uuid, 'base64touuid');
    });
  }, 'UUID as base64');
})();}
