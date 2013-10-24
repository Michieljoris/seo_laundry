/*global module:false require:false */
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:7 maxlen:150 devel:true newcap:false*/ 

//TODO use site map to once per interval crawl a hardcoded site to
//prevent dos or crawl it properly the way googlebot would, reading
//the fragment header and spidering along
//TODO possibly use memcache
//TODO compress memory cache? Still faster then disk..

//RISKS: memory and/or disk can get full, but site would have to be big..

//RISKS: requests for bogus path for legit host, phantom js gets into
//gear every time, slows computer down. Better is to crawl whitelisted
//sites every so often.

var sites =  {
    "http://firstdoor.axion5.net" : 1 //days between crawls, 0 is don't schedule crawls
};

var options = {
    verbose: true,
    cacheSize: 10,
    //TODO set expire to a higher number. Which number?
    expire: 10, //time before memory cache items expire
    onDemand: true,
    cacheDir: './cache',
    crawl: {
        schedule: true,
        start: 3, //hour of the day
        now: true
    }
};

var //fs = require('fs'),
    wash = require('url_washer'),
    sys = require('sys'),
    // VOW = require('dougs_vow'),
    memory = require('cachejs').lru(options.cacheSize, options.expire), 
    Url = require('url'),
    crawl = require('./crawl')({ cacheDir: options.cacheDir }),
    disk = require('./disk')(options.cacheDir)

;

require('date-utils');

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

module.exports.handleGet = function(req, res) {
    var url = req.url.query.url;
    var parsed = Url.parse(url).host;
    var onDisk;
    
    var site = sites[parsed.protocol + '//' + parsed.host];
    
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
        debug('url not found in memory');
        onDisk = disk(url, function(html) {
            memory(url, html);
        });
        if (!onDisk) {
            debug('url not found on disk');
            if (options.onDemand)
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
            else {
                memory(url);
                disk(url);
                sendError(req, res, 'Url not cached: ' + url);   
            }
            
        }
    }
};

var daysSince = 0;
function crawlSites() {
    var list = [];
    Object.keys(sites).forEach(function(site) {
        list.push(site);
    });
    function recur() {
        if (list) {
            debug('Crawling ' + list[list.length-1]);
            var site = list.pop();
            if (sites[site] && daysSince%sites[site] === 0)
                crawl(site).when(
                    function() {
                        debug('Done crawling ' + list[list.length-1]);
                        recur(); 
                    });
            else recur();
        }
        else {
            daysSince ++;
            debug('Done crawling sites');   
        }
    }
    recur(); 
}


//crawl sites and set schedules to do it again 
//data goes to cache dir
var nsites = Object.keys(sites).length;
if (nsites && options.crawl && options.crawl.schedule) {
    var wait = Date.tomorrow().addHours(options.crawl.start || 3) - Date.now();
    setTimeout(function() {
        crawlSites();
        setInterval(crawlSites, 24 * 60 * 60 * 1000);
    }, wait);
}

if (options.crawl.now) crawlSites();

// module.exports.init();

// console.log(new Date(new Date().getTime() + 6000000));
// var tomorrow = Date.tomorrow().addHours(options.workhours.start).getTime();
// console.log((tomorrow - Date.now())/3600000);
// var interval = ((options.workhours.end - options.workhours.start)/Object.keys(sites).length) * 60 * 60 * 1000;
// console.log(interval);
// console.log(Date.tomorrow().addMilliseconds(interval));

