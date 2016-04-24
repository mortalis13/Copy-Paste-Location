const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/Services.jsm');

var button,menu,copyButton,pasteButton,pasteNewTabButton
var copyIcon = "chrome://copy-paste-location/content/copyIcon.png";
var pasteIcon = "chrome://copy-paste-location/content/pasteIcon.png";
var pasteNewTabIcon = "chrome://copy-paste-location/content/pasteNewTabIcon.png";

const nsSupportsString = Components.Constructor("@mozilla.org/supports-string;1", "nsISupportsString");
function SupportsString(str) {
    var res = nsSupportsString();
    res.data = str;
    return res;
}

const nsTransferable = Components.Constructor("@mozilla.org/widget/transferable;1", "nsITransferable");
function Transferable(source) {
    var res = nsTransferable();
    if ('init' in res) {
        if (source instanceof Ci.nsIDOMWindow)
            source = source.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
        res.init(source);
    }
    return res;
}

function copyText(window,text){
	var trans = Transferable(window);
	trans.addDataFlavor("text/unicode");
	trans.setTransferData("text/unicode", SupportsString(text), text.length * 2);
	Services.clipboard.setData(trans, null, Services.clipboard.kGlobalClipboard);
}

function pasteText(window){
	var trans = Transferable(window);
	trans.addDataFlavor("text/unicode");
	
	Services.clipboard.getData(trans, Services.clipboard.kGlobalClipboard);
	var text={};
	var len={};
	trans.getTransferData("text/unicode", text, len);
	
	var addr=text.value.QueryInterface(Ci.nsISupportsString).data
	return addr
}

function loadIntoWindow(window) {
	pasteButton = window.NativeWindow.pageactions.add({
		title:"Paste And Go",
		icon: window.resolveGeckoURI(pasteIcon),
		clickCallback:function(){
			pasteLocation(window);
		}
	})
	pasteNewTabButton=window.NativeWindow.pageactions.add({
		title:"Paste In New Tab",
		icon: window.resolveGeckoURI(pasteNewTabIcon),
		clickCallback:function(){
			pasteNewTabLocation(window);
		}
	})
	copyButton = window.NativeWindow.pageactions.add({
		title:"Copy Location",
		icon: window.resolveGeckoURI(copyIcon),
		clickCallback:function(){
			copyLocation(window);
		}
	})
}

function copyLocation(window){
	var win=window.content
	var addr=win.location.href
	copyText(win,addr)
	window.NativeWindow.toast.show("Address Copied","short")
}

function pasteNewTabLocation(window){
	var addr=pasteText(window)
	window.BrowserApp.addTab(addr)
}

function pasteLocation(window){
	var addr=pasteText(window)
	window.content.location=addr
}

function unloadFromWindow(window) {
  if (!window) return;
  window.NativeWindow.pageactions.remove(copyButton);
  window.NativeWindow.pageactions.remove(pasteButton);
  window.NativeWindow.pageactions.remove(pasteNewTabButton);
}

var windowListener = {
  onOpenWindow: function(aWindow) {
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    domWindow.addEventListener("UIReady", function onLoad() {
      domWindow.removeEventListener("UIReady", onLoad, false);
      loadIntoWindow(domWindow);
    }, false);
  },
 
  onCloseWindow: function(aWindow) {},
  onWindowTitleChange: function(aWindow, aTitle) {}
};

function startup(aData, aReason) {
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(domWindow);
  }
  Services.wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
  if (aReason == APP_SHUTDOWN) return;
  Services.wm.removeListener(windowListener);
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }
}
