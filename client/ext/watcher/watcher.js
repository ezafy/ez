/**
 * Watcher Module for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */

require.def("ext/watcher/watcher",
    ["core/ext", "core/ide", "core/util"],
    function(ext, ide, util) {

return ext.register("ext/watcher/watcher", {
    name    : "Watcher",
    dev     : "Ajax.org",
    alone   : true,
    type    : ext.GENERAL,
    markup  : null,
    visible : true,
    
    hook : function() {
        // console.log("Initializing watcher");
        
        var removedPaths        = {},
            removedPathCount    = 0,
            changedPaths        = {},
            changedPathCount    = 0,
            ignoredPaths        = {},
            expandedPaths       = {};
            
        function sendWatchFile(path) {
            // console.log("Sending watchFile message for file " + path);
            ide.socket.send(JSON.stringify({
                "command"     : "watcher",
                "type"        : "watchFile",
                "path"        : path
            }));
        }
        
        function sendUnwatchFile(path) {
            // console.log("Sending unwatchFile message for file " + path);
            ide.socket.send(JSON.stringify({
                "command"     : "watcher",
                "type"        : "unwatchFile",
                "path"        : path
            }));
        }           
       
        function checkPage() {
            var page = tabEditors.getPage(),
                data = page.$model.data,
                path = data.getAttribute("path");
            
            if (removedPaths[path]) {
                util.question(
	                "File removed, keep tab open?",
	                path + " has been deleted, or is no longer available.",
	                "Do you wish to keep the file open in the editor?",
	                function() { // Yes
	                    apf.xmldb.setAttribute(data, "changed", "1");
	                    delete removedPaths[path];
	                    --removedPathCount;
	                    winQuestion.hide();
	                },
	                function() { // Yes to all
	                    var pages = tabEditors.getPages();
	                    
	                    pages.forEach(function(page) {
	                       apf.xmldb.setAttribute(page.$model.data, "changed", "1");
	                    });
	                    removedPaths = {};
	                    removedPathCount = 0;
	                    winQuestion.hide();
	                },
	                function() { // No
	                    tabEditors.remove(page);
	                    delete removedPaths[path];
	                    --removedPathCount;
	                    winQuestion.hide();
	                },
	                function() { // No to all
	                    var pages = tabEditors.getPages();
	                    
	                    pages.forEach(function(page) {
	                    if (removedPaths[page.$model.data.getAttribute("path")])
	                        tabEditors.remove(page);
	                    });
	                    removedPaths = {};
	                    removedPathCount = 0;
	                    winQuestion.hide();
	                }
                );
                btnQuestionYesToAll.setAttribute("visible", removedPathCount > 1);
                btnQuestionNoToAll.setAttribute("visible", removedPathCount > 1);
            } else if (changedPaths[path]) {
                util.question(
                    "File changed, reload tab?",
                    path + " has been changed by another application.",
                    "Do you want to reload it?",
                    function() { // Yes
                        ide.dispatchEvent("reload", {doc : page.$doc});
                        delete changedPaths[path];
                        --changedPathCount;
                        winQuestion.hide();
                    },
                    function() { // Yes to all
                        var pages = tabEditors.getPages();
                        
                        pages.forEach(function (page) {
                            if (changedPaths[page.$model.data.getAttribute("path")])
                                ide.dispatchEvent("reload", {doc : page.$doc});
                        });
                        changedPaths = {};
                        changedPathCount = 0;
                        winQuestion.hide();
                    },
                    function() { // No
                        delete changedPaths[path];
                        --changedPathCount;
                        winQuestion.hide();
                    },
                    function() { // No to all
                        changedPaths = {};
                        changedPathCount = 0;
                        winQuestion.hide();
                    }
                );
                btnQuestionYesToAll.setAttribute("visible", changedPathCount > 1);
                btnQuestionNoToAll.setAttribute("visible", changedPathCount > 1);
            }
        }
        
        stServerConnected.addEventListener("activate", function() {
            var pages = tabEditors.getPages();
            
            pages.forEach(function (page) {
                sendWatchFile(page.$model.data.getAttribute("path"));
            });
            for (var path in expandedPaths)
                sendWatchFile(path);
        });
        
        ide.addEventListener("openfile", function(e) {
            var path = e.doc.getNode().getAttribute("path");

            // console.log("Opened file " + path);
            if (ide.socket)
                sendWatchFile(path);
            else
                stServerConnected.addEventListener("activate", function () {
                    sendWatchFile(path);
                    stServerConnected.removeEventListener("activate", arguments.callee);
                });
        });        

        ide.addEventListener("closefile", function(e) {
            var path = e.xmlNode.getAttribute("path");

            if (ide.socket)
                sendUnwatchFile(path);
            else
                stServerConnected.addEventListener("activate", function () {
                    sendUnwatchFile(path);
                    stServerConnected.removeEventListener("activate", arguments.callee);
                });
        });
        
        ide.addEventListener("afterfilesave", function(e) {
            var path = e.node.getAttribute("path");
            
            // console.log("Adding " + path + " to ignore list");
            ignoredPaths[path] = path;
        });
                
        ide.addEventListener("socketMessage", function(e) {
            var pages = tabEditors.getPages();
            
            with (e.message) {
                if (type != "watcher")
                    return;
	            if (expandedPaths[path])
	                return ide.dispatchEvent("treechange", {
	                    path    : path,
	                    files   : files
	                });
                if (!pages.some(function (page) {
                    return page.$model.data.getAttribute("path") == path;
                }))
                    return;
                switch (subtype) {
                case "create":
                    break;
                case "remove":
                    if (!removedPaths[path]) {
                        removedPaths[path] = path;
                        ++removedPathCount;
                        checkPage();
                        /*
                        ide.dispatchEvent("treeremove", {
                            path : path
                        });
                        */
                    }
                    break;
                case "change":
                    if (ignoredPaths[path]) {
                        // console.log("Ignoring change notification for file " + path);
                        delete ignoredPaths[path];
                    } else if (!changedPaths[path]) {
                        changedPaths[path] = path;
                        ++changedPathCount;
                        checkPage();
                    }
                    break;
                }
            }
        });
        
        tabEditors.addEventListener("afterswitch", function(e) {
            checkPage();
        });
        
        trFiles.addEventListener("expand", function(e) {
            var node = e.xmlNode;
            
            if (node.getAttribute("type") == "folder") {
                var path = node.getAttribute("path");
                
                expandedPaths[path] = path;
                sendWatchFile(path);
            }
        });
        
        trFiles.addEventListener("collapse", function (e) {
            var node = e.xmlNode;
            
            if (node.getAttribute("type") == "folder") {
                var path = node.getAttribute("path");
                
                delete expandedPaths[path];
                sendUnwatchFile(path);
            }
        });
    },
});

    }
);
