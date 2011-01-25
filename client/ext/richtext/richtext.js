/**
 * richtext Editor for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
require.def("ext/richtext/richtext",
    ["core/ide", "core/ext"],
    function(ide, ext) {

return ext.register("ext/richtext/richtext", {
    name    : "Rich Text Editor",
    dev     : "Ajax.org",
    type    : ext.EDITOR,
    contentTypes : [
        "text/html",
        "application/xhtml+xml",
        "application/rtf"
    ],

    nodes : [],

    init : function(amlPage){
        this.rteEditor = amlPage.appendChild(new apf.editor({
            value   : "[data]",
            anchors : "0 0 0 0"
        }));

        this.nodes.push(
            //Add a panel to the statusbar showing whether the insert button is pressed
            sbMain.appendChild(new apf.section({
                caption : "{rteEditor.insert}"
            })),

            //Add a panel to the statusbar showing the length of the document
            sbMain.appendChild(new apf.section({
                caption : "Length: {rteEditor.value.length}"
            }))
        );
    },

    enable : function(){
        this.nodes.each(function(item){
            item.show();
        });
    },

    disable : function(){
        this.nodes.each(function(item){
            item.hide();
        });
    },

    destroy : function(){
        this.nodes.each(function(item){
            item.destroy(true, true);
        });

        if (this.rteEditor)
            this.rteEditor.destroy(true, true);

        this.nodes = [];
    }
});

    }
);