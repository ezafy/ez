/**
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
 
require("./requireJS-node");
require.paths.unshift(__dirname + "/../server");

require.paths.unshift(__dirname + "/connect/lib");
require.paths.unshift(__dirname + "/async/lib");
require.paths.unshift(__dirname + "/jsdav/lib");
require.paths.unshift(__dirname + "/socket.io/lib");
require.paths.unshift(__dirname + "/ace/lib");
require.paths.unshift(__dirname + "/ace/support/cockpit/support/pilot/lib");
require.paths.unshift(__dirname + "/lib-v8debug/lib");
require.paths.unshift(__dirname);

require.paths.unshift(__dirname + "/../demo/plugin");
require.paths.unshift(__dirname + "/../demo/template");