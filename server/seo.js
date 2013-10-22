/*global module:false require:false */
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:7 maxlen:150 devel:true newcap:false*/ 

//TODO use site map to once per interval crawl a hardcoded site to
//prevent dos or crawl it properly the way googlebot would, reading
//the fragment header and spidering along
//TODO possibly use memcache

//RISKS: memory and/or disk can get full, but site would have to be big..

//RISKS: requests for bogus path for legit host, phantom js gets into
//gear every time, slows computer down. Better is to crawl whitelisted
//sites every so often.

var sites =  {
    "firstdoor.axion5.net" : {
        expire: 10 //seconds befor memory cache items expire
        ,frequency: 24 * 60 * 60 //seconds in between crawls, falsy is disable
        //at least one of the following has to be true, otherwise no
        //links will be crawled
        ,sitemap: false  //true to use sitemap
        ,spider: false //true to follow all links found
        //some servers ever only serve one page to a site, then all
        //paths are js dependent, so set following false
        ,hashbang: false //true to follow only hashbang paths
    }
};

var options = {
    verbose: true,
    cacheSize: 10
};

var //fs = require('fs'),
    wash = require('url_washer'),
    sys = require('sys'),
    // VOW = require('dougs_vow'),
//TODO set expire to a higher number. Which number?
    memory = require('cachejs').lru(options.cacheSize, 10).cache, //expires in 10 seconds
    Url = require('url'),
    crawl = require('./crawl'),
    disk = require('./disk'),
    schedule = require('node-schedule')

;

// var log = [];
function debug() {
    if (options.verbose) console.log.apply(console, arguments);
    // log.push(arguments);
}

function escapeHtml(value) {
    return value.toString().
        replace('<', '&lt;').
        replace('>', '&gt;').
        replace('"', '&quot;');
}

function sendError(req, res, error) {
    res.writeHead(500, {
        'Content-Type': 'text/html'
    });
    res.write('<!doctype html>\n');
    res.write('<title>Internal Server Error</title>\n');
    res.write('<h1>Internal Server Error</h1>');
    res.write('<pre>' + escapeHtml(sys.inspect(error)) + '</pre>');
    res.end();
    debug('500 Internal Server Error');
    debug(sys.inspect(error));
}

module.exports.init = function() {
    sites.forEach(function(site) {
        
    });
   //crawl sites and set schedules to do it again 
    //data goes to cache dir
};

module.exports.handleGet = function(req, res) {
    var url = req.url.query.url;
    var host = Url.parse(url).host;
    var onDisk;
    
    var site = sites[host];
    
    if (!site) {
        res.end('Not just any site..');
        return;
    }
    
    var inMemory = memory(url, function(value) {
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'max-age=0'
	    // ,'last-modified': GMTdate
        });
        res.end(value.html);
    }); 
    
    if (!inMemory)  {
        onDisk = disk(url, function(html) {
            memory(url, html);
        });
        if (!onDisk) {
            debug('url not found on disk');
            wash(url).when(
                function(html) {
                    disk(url, html);
                }
                ,function(err) {
                    debug('ERROR washing url:', err);
                    //cancels callbacks:
                    memory(url);
                    disk(url);
                    sendError(req, res, err);
                }
            );
            
        }
    }
};
