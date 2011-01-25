/**
 * Node Runner Module for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */

define(function(require, exports, module) {

var ide = require("core/ide");
var ext = require("core/ext");
var noderunner = require("ext/noderunner/noderunner");
var settings = require("ext/settings/settings");
var save = require("ext/save/save");
var markup = require("text!ext/run/run.xml");

return ext.register("ext/run/run", {
    name   : "Run Toolbar",
    dev    : "Ajax.org",
    type   : ext.GENERAL,
    alone  : true,
    markup : markup,
    deps   : [noderunner],
    commands : {
        "resume"   : {hint: "resume the current paused process"},
        "stepinto" : {hint: "step into the function that is next on the execution stack"},
        "stepover" : {hint: "step over the current expression on the execution stack"},
        "stepout"  : {hint: "step out of the current function scope"}
    },
    hotitems: {},

    nodes : [],

    init : function(amlNode){
        while(tbRun.childNodes.length) {
            var button = tbRun.firstChild;
            ide.barTools.appendChild(button);
            this.nodes.push(button);
        }
        
        this.hotitems["resume"]   = [btnResume];
        this.hotitems["stepinto"] = [btnStepInto];
        this.hotitems["stepover"] = [btnStepOver];
        this.hotitems["stepout"]  = [btnStepOut];

        var _self = this;
        mdlRunConfigurations.addEventListener("afterload", function(e) {
            _self.$updateMenu();
        });
        mdlRunConfigurations.addEventListener("update", function(e) {
            settings.save();
            if (e.action == "add" || e.action == "redo-remove" || e.action == "attribute")
                _self.$updateMenu();
        });

        ide.addEventListener("loadsettings", function(e){
            var runConfigs = e.model.queryNode("auto/configurations");
            if (!runConfigs)
                runConfigs = apf.createNodeFromXpath(e.model.data, "auto/configurations");

            mdlRunConfigurations.load(runConfigs);
        });

        winRunCfgNew.addEventListener("hide", function() {
            mdlRunConfigurations.data.setAttribute("debug", "0");
        });
        
        lstScripts.addEventListener("afterselect", function(e) {
            e.selected && require("ext/debugger/debugger").showDebugFile(e.selected.getAttribute("scriptid"));
        });
    },

    duplicate : function() {
        var config = lstRunCfg.selected;
        if (!config)
            return;

        var duplicate = config.cloneNode(true);
        apf.b(config).after(duplicate);
        lstRunCfg.select(duplicate);
        winRunCfgNew.show();
    },

    addConfig : function() {
        var file = ide.getActivePageModel();

        if (!file || (file.getAttribute("contenttype") || "").indexOf("application/javascript") != 0) {
            var path = "";
            var name = "server";
        }
        else {
            path = file.getAttribute("path").slice(ide.davPrefix.length + 1);
            name = file.getAttribute("name").replace(/\.js$/, "");
        }

        var cfg = apf.n("<config />")
            .attr("path", path)
            .attr("name", name)
            .attr("args", "").node();

        mdlRunConfigurations.appendXml(cfg);
        lstRunCfg.select(cfg);
        winRunCfgNew.show();
    },

    showRunConfigs : function(debug) {
        mdlRunConfigurations.data.setAttribute("debug", debug ? "1": "0");
        winRunCfgNew.show();
    },

    run : function(debug) {
        var config = lstRunCfg.selected;
        mdlRunConfigurations.data.setAttribute("debug", debug ? "1": "0");
        if (!config) {
            this.addConfig();
        }
        else
            this.runConfig(config, debug);
    },

    $updateMenu : function() {
        var menus = [mnuRunCfg, mnuDebugCfg];

        for (var j=0; j<menus.length; j++) {
            var menu = menus[j];

            var item = menu.firstChild;
            while(item && item.tagName !== "a:divider") {
                menu.removeChild(item);
                item = menu.firstChild;
            }
            var divider = item;

            var configs = mdlRunConfigurations.queryNodes("config");
            if (!configs.length)
                menu.insertBefore(new apf.item({disabled:true, caption: "no run history"}), divider);
            else {
                for (var i=0,l=configs.length; i<l; i++) {
                    var item = new apf.item({
                        caption: configs[i].getAttribute("name")
                    });
                    item.$config = configs[i];

                    var _self = this;
                    item.onclick = function(debug) {
                        _self.runConfig(this.$config, debug);
                        lstRunCfg.select(this.$config);
                    }.bind(item, menu == mnuDebugCfg);
                    menu.insertBefore(item, menu.firstChild);
                }
            }
        }
    },

    runConfig : function(config, debug) {
        var model = settings.model;
        var saveallbeforerun = model.queryValue("general/@saveallbeforerun");
        if(saveallbeforerun) save.saveall();
        
        if (debug === undefined)
            debug = config.parentNode.getAttribute("debug") == "1";

        config.parentNode.setAttribute("debug", "0");
        noderunner.run(config.getAttribute("path"), config.getAttribute("args").split(" "), debug);
    },

    stop : function() {
        noderunner.stop();
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

});