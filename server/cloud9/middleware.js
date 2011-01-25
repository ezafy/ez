var connect = require("connect"),
    error   = require("./error"),
    exec    = require("child_process").exec,
    fs      = require("fs"),
    parse   = require("url").parse,
    path    = require("path"),
    utils   = require("connect/lib/connect/utils");

exports.staticProvider = function (root, mount) {
    var staticGzip      = exports.staticGzip({
                            root        : path.normalize(root),
                            compress    : [
                                "application/javascript",
                                "application/xml",
                                "text/css",
                                "text/html"
                            ]
                        }),
        staticProvider  = connect.staticProvider(path.normalize(root));

    return function (request, response, next) {
        var url         = request.url,
            pathname    = require("url").parse(url).pathname;

        if (pathname.indexOf(mount) === 0) {
            request.url = url.replace(mount, "") || "/";
            staticGzip(request, response, function (err) {
                if (err) {
                    request.url = url;
                    return next(err);
                }

                staticProvider(request, response, function (err) {
                    request.url = url;
                    next(err);
                });
            });
        } else
            next();
    };
}

exports.errorHandler = function() {
    return function(err, req, res, next) {
        if (!(err instanceof Error)) {
            err = new error.InternalServerError(err + "")
        }
        else if (!(err instanceof error.HttpError)) {
            err.code = 500
            err.defaultMessage = "Internal Server Error"
        }

        res.writeHead(err.code, {
            "Content-Type": "text/plain"
        });
        res.end(err.message + (err.stack ? "\n" + err.stack : ""));
        if (err.stack)
            console.log("Exception found" + err.message + "\n" + err.stack);
    }
};

exports.bin = "gzip";

exports.flags = "--best";

exports.staticGzip = function(options){
    var options = options || {},
        root = options.root,
        compress = options.compress,
        flags = options.flags || exports.flags,
        bin = options.bin || exports.bin;

    if (!root) throw new Error('staticGzip root must be set');
    if (!compress) throw new Error('staticGzip compress array must be passed');

    return function(req, res, next){
        if (req.method !== 'GET') return next();

        var acceptEncoding = req.headers['accept-encoding'] || '';

        // Ignore when Accept-Encoding does not allow gzip
        if (acceptEncoding && !~acceptEncoding.indexOf('gzip')) return next();

        // Parse the url
        var url = parse(req.url),
            filename = path.join(root, url.pathname),
            mime = utils.mime.type(filename).split(';')[0];

        // MIME type not white-listed
        if (!~compress.indexOf(mime)) return next();

        // Check if gzipped static is available
        gzipped(filename, function(err, path, ext){
            if (err && err.errno === process.ENOENT) {
                next();
                // We were looking for a gzipped static,
                // so lets gzip it!
                if (err.path.indexOf('.gz') === err.path.length - 3) {
                    gzip(filename, path, flags, bin);
                }
            } else if (err) {
                next(err);
            } else {
                // Re-write the url to serve the gzipped static
                req.url = url.pathname + ext;
                req.url = req.url.replace(/[^/]+$/, ".$&");
                var writeHead = res.writeHead;
                res.writeHead = function(status, headers){
                    headers = headers || {};
                    res.writeHead = writeHead;
                    headers['Content-Type'] = mime;
                    headers['Content-Encoding'] = 'gzip';
                    res.writeHead(status, headers);
                };
                next();
            }
        });
    }
};

function gzipped(path, fn) {
    fs.stat(path, function(err, stat){
        if (err) return fn(err);
        var ext = '.' + Number(stat.mtime) + '.gz';
        path += ext;
        path = path.replace(/[^/]+$/, ".$&");
        fs.stat(path, function(err){
            fn(err, path, ext);
        });
    });
};

function gzip(src, dest, flags, bin) {
    var cmd = bin + ' ' + flags + ' -c ' + src + ' > ' + dest;
    exec(cmd, function(err, stdout, stderr){
        if (err) {
            console.error('\n' + err.stack);
            fs.unlink(dest);
        }
    });
};
