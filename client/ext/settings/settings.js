/**
 * Extension Manager for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
 
define(function(require, exports, module) {
 
var ide = require("core/ide");
var ext = require("core/ext");
var util = require("core/util");
var fs = require("ext/filesystem/filesystem");
var markup = require("text!ext/settings/settings.xml");
var template = require("text!ext/settings/template.xml");
  
return ext.register("ext/settings/settings", {
    name    : "Settings",
    dev     : "Ajax.org",
    alone   : true,
    type    : ext.GENERAL,
    markup  : markup,
    file    : ide.settingsUrl,
    commands : {
        "showsettings": {hint: "open the settings window"}
    },
    hotitems: {},

    nodes : [],

    save : function(){
        var _self = this;
        clearTimeout(this.$customSaveTimer);

        this.$customSaveTimer = setTimeout(function(){
            ide.dispatchEvent("savesettings", {model : _self.model});
            _self.saveToFile();
        }, 100);
    },

    saveToFile : function(){
        //apf.console.log("SAVING SETTINGS");
        fs.saveFile(this.file, this.model.data && apf.xmldb.cleanXml(this.model.data.xml) || "");
    },

    saveSettingsPanel: function() {
        var pages   = self.pgSettings ? pgSettings.getPages() : [],
            i       = 0,
            l       = pages.length,
            changed = false;
        for (; i < l; ++i) {
            if (!pages[i].$at) continue;
            if (pages[i].$at.undolength > 0) {
                pages[i].$commit(pages[i]);
                changed = true;
            }
        }
        if (ide.dispatchEvent("savesettings", {
            model : this.model
        }) !== false || changed)
            this.saveToFile();
    },

    getSectionId: function(part) {
        return "pgSettings" + part.replace(/ /g, "_");
    },

    addSection : function(tagName, name, xpath, cbCommit){
        var id = this.getSectionId(name),
            page = pgSettings.getPage(id);
        if (page)
            return page;
		var node = this.model.queryNode(xpath + "/" + tagName);
        if (!node) {
            this.model.appendXml('<' + tagName + ' name="' + name +'" page="' + id + '" />', xpath);
		} else
			node.setAttribute("page", id);
        page = pgSettings.add(name, id);
        page.$at = new apf.actiontracker();
        page.$commit = cbCommit || apf.K;
        return page;
    },

    hook : function(){
        var _self = this;
        this.nodes.push(
            ide.mnuFile.insertBefore(new apf.item({
                caption : "Settings...",
                onclick : this.showsettings.bind(this)
            }), ide.mnuFile.childNodes[ide.mnuFile.childNodes.length - 2])
        );
        this.hotitems["showsettings"] = [this.nodes[0]];

        this.model = new apf.model();
        /*fs.readFile(_self.file, function(data, state, extra){
            if (state != apf.SUCCESS)
                _self.model.load(template);
            else
                _self.model.load(data);

            ide.dispatchEvent("loadsettings", {
                model : _self.model
            });
        });*/

        this.model.load(this.convertOrBackup() ? template : ide.settings);

        ide.dispatchEvent("loadsettings", {
            model : _self.model
        });

        var checkSave = function() {
            if (ide.dispatchEvent("savesettings", {
                model : _self.model
            }) === true)
                _self.saveToFile();
        };
        this.$timer = setInterval(checkSave, 60000);

        // apf.addEventListener("exit", checkSave);

        ide.addEventListener("$event.loadsettings", function(callback) {
            callback({model: _self.model});
        });
    },

    convertOrBackup: function() {
        if (!ide.settings || ide.settings.indexOf("d:error") > -1)
            return true;
        // <section> elements are from version < 0.0.3 (deprecated)...
        if (ide.settings.indexOf("<section") > -1) {
            // move file to /workspace/.settings.xml.old
            var moved = false,
                _self = this;
            apf.asyncWhile(function() {
                return !moved;
            },
            function(iter, next) {
                //move = function(sFrom, sTo, bOverwrite, bLock, callback)
                var newfile = _self.file + ".old" + (iter === 0 ? "" : iter);
                fs.webdav.move(_self.file, newfile, false, null, function(data, state, extra) {
                    var iStatus = parseInt(extra.status);
                    if (iStatus != 403 && iStatus != 409 && iStatus != 412
                      && iStatus != 423 && iStatus != 424 && iStatus != 502 && iStatus != 500) {
                        moved = true;
                    }
                    next();
                });
            });
            return true;
        }

        return false;
    },

    init : function(amlNode){
        this.btnOK = winSettings.selectSingleNode("a:vbox/a:hbox[2]/a:button[1]");
        this.btnOK.onclick = this.saveSettings.bind(this);
        this.btnCancel = winSettings.selectSingleNode("a:vbox/a:hbox[2]/a:button[2]");
        this.btnCancel.onclick = this.cancelSettings;
        this.btnApply = winSettings.selectSingleNode("a:vbox/a:hbox[2]/a:button[3]");
        this.btnApply.onclick = this.applySettings.bind(this);
    },

    showsettings: function() {
        ext.initExtension(this);
        winSettings.show();
        return false;
    },

    saveSettings: function() {
        winSettings.hide();
        this.saveSettingsPanel();
    },

    applySettings: function() {
        this.saveSettingsPanel();
    },

    cancelSettings: function() {
        winSettings.hide();
        var pages = pgSettings.getPages(),
            i     = 0,
            l     = pages.length;
        for (; i < l; ++i) {
            if (!pages[i].$at) continue;
            pages[i].$at.undo(-1);
        }
    },

    enable : function(){
        this.nodes.each(function(item){
            item.enable();
        });
    },

    disable : function(){
        this.nodes.each(function(item){
            item.disable();
        });
    },

    destroy : function(){
        this.nodes.each(function(item){
            item.destroy(true, true);
        });
        this.nodes = [];
    }
});

    }
);