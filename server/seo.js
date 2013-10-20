/*global process:false require:false exports:false*/
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/

/*jshint maxparams:7 maxcomplexity:7 maxlen:150 devel:true newcap:false*/ 

var fs = require('fs'),
    wash = require('url_washer'),
    VOW = require('dougs_vow'),
    cache = require('cachejs')

;

// launder('http://localhost:8080')
//TODO use site map to once per interval crawl a hardcoded site to
//prevent dos or crawl it properly the way googlebot would, reading
//the fragment header and spidering along
//TODO results need to be cached, on disk and in memory.
//TODO possibly use memcache

var sites = [ {
    url: 'http://firstdoor.axion5.net'
    ,frequency: 24 //hours
    ,sitemap: false  //true to use sitemap
}];

module.exports.handleGet = function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
	// 'last-modified': GMTdate
    });
    console.log('query',req.url.query);
    wash(req.url.query.url)
        .when(
            function(html) {
                console.log('washed:', html);
                res.end(html);
            }
            ,function(err) {
                console.log('ERROR washed:', err);
                res.end('ERROR: ' + JSON.stringify(err));   
            }
        );
    

};
