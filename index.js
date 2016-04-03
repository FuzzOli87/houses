var req = require('request-promise');
var cheerio = require('cheerio');
var async = require('async');

// var domUtils = require('domutils');
// var HtmlParser = require('htmlparser2');
// var domHandler = new HtmlParser.DomHandler(function (err, dom) {
//  var matchingTags = domUtils.getElements({ class: 'singleLineDisplay ajax_display d5m_show' }, dom, true);
  // var mTags = domUtils.getElements({ href: 'javascript:__doPostBack(&#39;_ctl0$m_DisplayCore&#39;,&#39;Redisplay|1076,0&#39;)'}, dom, true);
//   var mTags = domUtils.getElements({ class: 'd5m12'}, matchingTags, true);
//   var mTagsThing = domUtils.getElements({ tag_type: 'span'}, mTags, true);
//   matchingTags.map(function(houseRow) {
//     return {
//       houseId: domUtils.getElements({ href: 'javascript:__doPostBack(&#39;_ctl0$m_DisplayCore&#39;,&#39;Redisplay|1076,0&#39;)'}, houseRow, true)
//     };
//   });
//   console.log('dom', mTagsThing);
//   console.log('dom', mTagsThing.length);
//
// });
// var parser = new HtmlParser.Parser(domHandler, { decodeEntities: true, normalizeWhitespace: true});

req.get('http://matrix.ntreis.net/Matrix/Public/Portal.aspx?ID=0-866322865-10#1', function(err, resp, body) {
  console.log('err', err);
  var $ = cheerio.load(body, { normalizeWhitespace: true, decodeEntities: true});
  var promisesToLookUp = [];
  $('.singleLineDisplay.ajax_display.d5m_show').find('.d5m12 > .formula').each(function(idx, element) {
    var singleAddy = $(this).text();
    promisesToLookUp.push(req({
      method: 'POST',
      uri: 'https://geomap.ffiec.gov/FFIECGeocMap/GeocodeMap1.aspx/GetGeocodeData',
      json: true,
      body: {
        sSingleLine: singleAddy + ' Plano, TX',
        iCensusYear: '2015'
      }
    }));
  });

  Promise.all(promisesToLookUp)
    .then(function(houses) {
      var housesInfo = [];
      var extracted = houses.map(function(house) {
        return house.d;
      });

      extracted.forEach(function(h) {
        // Get the census data
        housesInfo.push(req({
          method: 'POST',
          uri: 'https://geomap.ffiec.gov/FFIECGeocMap/GeocodeMap1.aspx/GetCensusData',
          json: true,
          body: {
            sMSACode: h.sMSACode,
            sStateCode: h.sStateCode,
            sCountyCode: h.sCountyCode,
            sTractCode: h.sTractCode,
            iCensusYear: h.iCensusYear
          }
        }));

        Promise.all(housesInfo)
          .then(function(cInfo) {
            var matches = [];
            var extractedCInfo = cInfo.map(function(cI) {
              return cI.d;
            });

            extractedCInfo.forEach(function(censusInfo) {
              extracted.forEach(function(hInfo) {
                if ((censusInfo.sTractCode === hInfo.sTractCode) && censusInfo.sMinority_percentage >= 51) {
                  matches.push({
                    address: hInfo.sAddress,
                    city: hInfo.sCityName,
                    minority: censusInfo.sMinority_percentage
                  });
                }
              });
            });

            console.log('matches', JSON.stringify(matches, null, 4));
          })
          .catch(function(err) {
            // console.log('err', err);
          })
      });


    })
    .catch(function(err) {
      console.log('err', err);
    });
});
