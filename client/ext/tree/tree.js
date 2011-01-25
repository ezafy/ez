/**
 * Code Editor for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
require.def("ext/tree/tree",
    ["core/ide", "core/ext",
     "ext/filesystem/filesystem", "ext/settings/settings", 
     "ext/panels/panels", "text!ext/tree/tree.xml"],
    function(ide, ext, fs, settings, panels, markup) {

return ext.register("ext/tree/tree", {
    name            : "Tree",
    dev             : "Ajax.org",
    alone           : true,
    type            : ext.GENERAL,
    markup          : markup,
    visible         : true,
    currentSettings : [],
    expandedList    : {},
    loading         : false,
    changed         : false,
    
    //@todo deprecated?
    getSelectedPath: function() {
        return trFiles.selected.getAttribute("path");
    },
    
    hook : function(){
        panels.register(this);
    },

    init : function() {
        this.panel = winFilesViewer;
        colLeft.appendChild(winFilesViewer);
        trFiles.setAttribute("model", fs.model);
        
        trFiles.addEventListener("afterchoose", this.$afterselect = function(e) {
            var node = this.selected;
            if (!node || node.tagName != "file" || this.selection.length > 1)
                return;

            ide.dispatchEvent("openfile", {doc: ide.createDocument(node)});
        });
        
        trFiles.addEventListener("beforerename", function(e){
            setTimeout(function(){
                fs.beforeRename(e.args[0], e.args[1]);
            });
        });
        
        trFiles.addEventListener("beforemove", function(e){
            setTimeout(function(){
                var changes = e.args;
                for (var i = 0; i < changes.length; i++) {
                    fs.beforeMove(changes[i].args[0], changes[i].args[1]);
                }
            });
        });

        /**** Support for state preservation ****/
        
        var _self = this;
        
        trFiles.addEventListener("expand", function(e){
            _self.expandedList[e.xmlNode.getAttribute(apf.xmldb.xmlIdTag)] = e.xmlNode;

            if (!_self.loading) {
                _self.changed = true;
                settings.save();
            }
        });
        trFiles.addEventListener("collapse", function(e){
            delete _self.expandedList[e.xmlNode.getAttribute(apf.xmldb.xmlIdTag)];
            
            if (!_self.loading) {
                _self.changed = true;
                settings.save();
            }
        });

        ide.addEventListener("loadsettings", function(e){
            var strSettings = e.model.queryValue("auto/tree");
            if (strSettings) {
                _self.loading = true;
                _self.currentSettings = apf.unserialize(strSettings);
                
                //Unstable - temporary fix
                try{
                    trFiles.expandList(_self.currentSettings, function(){
                        _self.loading = false;
                    });
                }catch(e){
                    e.model.setQueryValue("auto/tree/text()", "");
                }
            }
        });

        ide.addEventListener("savesettings", function(e){
            if (!_self.changed)
                return;
            
            var xmlSettings = apf.createNodeFromXpath(e.model.data, "auto/tree/text()");

            _self.currentSettings = [];

            var path, id, lut = {};
            for (id in _self.expandedList) {
                try {
                    path = apf.xmlToXpath(_self.expandedList[id], trFiles.xmlRoot);
                    lut[path] = true;
                }
                catch(e){
                    //Node is deleted
                    delete _self.expandedList[id];
                }
            }
            
            var cc, parts;
            for (path in lut) {
                parts = path.split("/");
                cc = parts.shift();
                do {
                    if (!parts.length) 
                        break;
                    
                    cc += "/" + parts.shift();
                } while(lut[cc]);
                
                if (!parts.length)
                    _self.currentSettings.push(path);
            }
            
            xmlSettings.nodeValue = apf.serialize(_self.currentSettings);
            return true;
        });
        
        /*
        ide.addEventListener("treecreate", function (e) {
            var names   = e.path.replace(/^\//g, "").split("/").reverse(),
                parent  = trFiles.getModel().data.firstChild,
                name, node;
                
            names.pop();
            do {
                if (!trFiles.$hasLoadStatus(parent, "loaded"))
                    break;
                name    = names.pop();
                // console.log("CHECKING", parent, name);
                node    = parent.selectSingleNode("node()[@name=\"" + name + "\"]");
                if (!node) {
                    var path = parent.getAttribute("path") + "/" + name,
                        xmlNode;
                        
                    if (names.length > 0 || e.type == "folder")
                        xmlNode = "<folder type='folder' " + " path='" + path + "' name='" + name + "' />";
                    // console.log("INSERTING", xmlNode, parent);
                    trFiles.add(xmlNode, parent);
                    break;   
                }
                parent = node;
            } while (names.length > 0);
                
        });
        
        ide.addEventListener("treeremove", function (e) {
            var path = e.path.replace(/\/([^/]*)/g, "/node()[@name=\"$1\"]")
                        .replace(/\[@name="workspace"\]/, "")
                        .replace(/\//, "");
            var node = trFiles.getModel().data.selectSingleNode(path);
            
            if (node)
                apf.xmldb.removeNode(node);
        });
        */
        
        ide.addEventListener("treechange", function(e) {
            var path    = e.path.replace(/\/([^/]*)/g, "/node()[@name=\"$1\"]")
                                .replace(/\[@name="workspace"\]/, "")
                                .replace(/\//, ""),
                parent  = trFiles.getModel().data.selectSingleNode(path),
                nodes   = parent.childNodes,
                files   = e.files,
                removed = [];
            
            for (var i = 0; i < nodes.length; ++i) {
                var node    = nodes[i],
                    name    = node.getAttribute("name");
                 
                if (files[name])
                    delete files[name];
                else
                    removed.push(node);
            }
            removed.forEach(function (node) {
                // console.log("REMOVE", node);
                apf.xmldb.removeNode(node); 
            });
            path = parent.getAttribute("path");
            for (var name in files) {
                var file = files[name];
                
                xmlNode = "<" + file.type +
                    " type='" + file.type + "'" +
                    " name='" + name + "'" +
                    " path='" + path + "/" + name + "'" +
                "/>";
                // console.log("CREATE", xmlNode, parent);
                trFiles.add(xmlNode, parent);
            }
        });
    },

    refresh : function(){
        trFiles.getModel().load("<data><folder type='folder' name='" + "Project" + "' path='" + ide.davPrefix + "' root='1'/></data>");
        this.expandedList = {};
        this.loading = true;
        try {
            var _self = this;
                    
            trFiles.expandList(this.currentSettings, function(){
                _self.loading = false;
            });
        } catch(e) {
        
        }
    },

    enable : function(){
        winFilesViewer.show();
    },

    disable : function(){
        winFilesViewer.hide();
    },

    destroy : function(){
        davProject.destroy(true, true);
        mdlFiles.destroy(true, true);
        trFiles.destroy(true, true);

        trFiles.removeEventListener("afterselect", this.$afterselect);
        
        panels.unregister(this);
    }
});

});
