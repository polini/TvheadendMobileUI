var prefs = {
		data: {},
		load: function () {
			var the_cookie = document.cookie.split(';');
			if (the_cookie[0]) {
				this.data = JSON.parse(unescape(the_cookie[0]));
			}
			return this.data;
		},
		save: function (expires, path) {
			var d = expires || new Date((new Date()).getTime()+1000*60*60*24*365);
			var p = path || '/';
			document.cookie = escape(JSON.stringify(this.data))
			+ ';path=' + p
			+ ';expires=' + d.toUTCString();
		}
};

var channels;
var channelTags;
var hourOffset = 4;
var channelOffset = 0;
var selectedTag = '';
var numChannels = 4;
var channelToColumn = new Array();
var selectedDay = new Date(new Date().getTime()-hourOffset*60*60*1000);
var channelNameToId = new Array();
var lastEpgResponse = new Array();
var mutex = new Array();

prefs.load();
if (prefs.data.cols != undefined)
	numChannels = prefs.data.cols;
if (window.location.search != undefined)
	selectedTag = window.location.search.replace('?','');
if (selectedTag == 0)
	selectedTag = '';

function readConfigs(response) {
	window.configs = response.entries;
	window.configSelect = '<select name="config">';
	for (i in response.entries) {
		var e = response.entries[i];
		var selected = (e.key == '') ? ' selected="selected"' : '';
		window.configSelect += '<option value="'+e.key+'"'+selected+'>'+e.val+'</option>';
	}
	window.configSelect += '</select>';
	window.configLoaded = true;
}

function readChannels(response) {
	var channels = new Array();
	for (var i in response.entries) {
		var e = response.entries[i];
		var sortNo = e.number!=undefined?e.number:9999;
		if (channels[sortNo] == undefined) channels[sortNo] = new Array();
		channels[sortNo][channels[sortNo].length] = e;
		channelNameToId[e.name] = e.uuid;
	}
	var channels2 = new Array();
	for (var i in channels) {
		for (var j in channels[i]) {
			channels2[channels2.length] = channels[i][j];
		}
	}
	window.channels = channels2;
}

function readEpg(response) {
	var uuid = undefined;
	for (var i in response.entries) {
		var e = response.entries[i];
		uuid = e.channelUuid;
		if (channelToColumn[uuid] != undefined) {
			var start = new Date(e.start*1000);
			var box = start.getHours();
			while (box % 4 > 0)
				box--;
			if (box == 0) box = 24;
			var refDay = new Date(start.getTime()-window.hourOffset*60*60*1000);
			if (refDay.getDate() == selectedDay.getDate() && refDay.getMonth() == selectedDay.getMonth()) {
				var td = document.getElementById(box+'_'+window.channelToColumn[uuid]); 
				var xclass = nvl(e.dvrState);
				var yclass = (start.getHours() == 20 || start.getHours() == 21)  && (e.stop-e.start) > 60*60 ? 'primetime' : '';
				var add = e.schedstate != undefined ? '<br />&nbsp;' : '';
				var epis = e.episodeOnscreen != undefined ? ' <span class="episode">'+e.episodeOnscreen+'</span>' : '';
				var html = '<tr class="item" start="'+e.start+'" duration="'+(e.stop-e.start)+'"><td class="time '+xclass+'">' + getTimeFromTimestamp(e.start) + add + '</td>\n<td class="content '+yclass+'" id="e_'+e.eventId+'"><div class="title"><a onclick="showHide(\'e_'+e.eventId+'\');">'+e.title+epis+'</a></div><div class="subtitle" onclick="showHide(\'e_'+e.eventId+'\');">'+nvl(e.subtitle)+'</div><div onclick="showHide(\'e_'+e.eventId+'\');" class="description">'+nvl(e.description)+'</div><div class="duration">'+getDuration(e.stop-e.start)+l('hour.short')+' &mdash; '+getTimeFromTimestamp(e.stop)+'</div><div class="action">';
				if (e.dvrState == 'scheduled' || e.dvrState == 'recording')
					html += '<input type="button" value="'+l('cancel')+'" onclick="cancel('+e.eventId+', \''+e.dvrUuid+'\',\''+e.channelName+'\');" />';
				else
					html += '<form>'+configSelect + '<br /><input type="button" value="'+l('record')+'" onclick="record('+e.eventId+', this, \''+e.channelName+'\');"/></form>';
				html += '</div></td></tr>';
				td.innerHTML += html;
			}
		}
	}
	window.mutex[response.param] = undefined;
	showCurrent();
	if (uuid)
		window.lastEpgResponse[uuid] = response;
}

function showCurrent() {
	var elems = document.getElementsByClassName('item');
	for (var i=0; i<elems.length; i++) {
		var elem = elems[i];
		elem.className = (parseInt(elem.getAttribute('start'))*1000 <= (new Date()).getTime() && 
				(parseInt(elem.getAttribute('start'))+parseInt(elem.getAttribute('duration')))*1000 >= (new Date()).getTime()) ? 'item current' : 'item';
	}
}

function cancel(id, dvrUuid, channel) {
	var entries = new Array();
	entries[0] = dvrUuid;
	var params = "uuid="+JSON.stringify(entries);
	doPostWithParam("api/idnode/delete", reloadChannel, params, channel);
}

function record(id, button, channel) {
	var params = 'event_id='+id+'&config_uuid='+button.form.config.value;
	doPostWithParam("api/dvr/entry/create_by_event", reloadChannel, params, channel);
}

function reloadChannel(response) {
	lastEpgResponse[channelNameToId[response.param]] = undefined;
	initEpg();
}

function showHide(id) {
	var elem = document.getElementById(id);
	if (elem.className.indexOf('big') >= 0)
		elem.className = elem.className.replace('big', '');
	else
		elem.className += ' big';
}

function loadEpgByChannel(channel) {
	if (mutex[channel] == undefined) {
		mutex[channel] = true;
		doPostWithParam("api/epg/events/grid", readEpg, 'start=0&limit=200&channel='+encodeURIComponent(channel), channel);
	}
}

function initEpg() {
	document.getElementById('day').innerHTML = getDateFromTimestamp(selectedDay.getTime()/1000, true);
	for (var i=4;i<=24; i+=4) {
		for (var j=0; j<numChannels;j++) {
			document.getElementById('c_'+j).innerHTML = '';
			if (document.getElementById(i+'_'+j))
				document.getElementById(i+'_'+j).innerHTML = '';
		}
	}
	if (channels != undefined && channelTags != undefined && configLoaded != undefined) {
		var cnt = 0;
		for (var i=0; i<channels.length; i++) {
			var ch = channels[i];
			if (selectedTag == '' || (','+ch.tags+',').indexOf(','+selectedTag+',') >= 0) {
				if (cnt-channelOffset >= 0 && cnt-channelOffset < numChannels) {
					var html = '<div><span class="link" onclick="showHide(\'s_'+(cnt-channelOffset)+'\');">'+image(getIcon(ch), 'middle',50,false) + ch.name + '</span>';
					if (cnt-channelOffset==numChannels-1) {
						html += '<span class="link" style="float:right;" onclick="pageChannels(+1);">'+icon('images/resultset_next.png')+'</span>';
					}
					var streamUrl = window.location.protocol+'//'+window.location.host+'/play/stream/channel/'+ch.uuid;
					html += '</div><div id="s_'+(cnt-channelOffset)+'" class="stream">';
					html += '<div><a target="_blank" href="'+streamUrl+'"><button>HTTP</button></a></div>';
					html += '<div><a target="_blank" href="buzzplayer://'+streamUrl+'"><button>Buzzplayer</button></a></div></div>';
					document.getElementById('c_'+(cnt-channelOffset)).innerHTML = html; 
					channelToColumn[ch.uuid] = cnt-channelOffset;
					if (lastEpgResponse[ch.uuid])
						readEpg(lastEpgResponse[ch.uuid]);
					else
						loadEpgByChannel(ch.uuid);
				}
				cnt++;
			}
		}
	}
	else {
		setTimeout(function() { initEpg(); }, 500);
	}
}

function pageChannels(plus) {
	channelToColumn = new Array();
	channelOffset += plus*numChannels;
	if (channelOffset < 0) channelOffset = 0;
	if (channelOffset + numChannels > channels.length) channelOffset = channels.length-numChannels;
	if (channelOffset < 0) channelOffset = 0;
	initEpg();
}

function pageDate(plus) {
	var day = selectedDay.getDate();
	while (selectedDay.getDate() == day) {
		selectedDay = new Date(selectedDay.getTime() + plus*12*60*60*1000);
	}
	initEpg();
}

function readChannelTags(response) {
	window.channelTags = response.entries;
	var sel = window.selectedTag == ''? ' selected' : '';
	var html = icon('../icons/channel_tags.png')+'<a id="t_" onclick="selectTag(\'\');" class="link'+sel+'">'+l('allChannels')+'</a>';
	for (var i=0; i<response.entries.length; i++) {	
		var e = response.entries[i];
		if (e.enabled == '1' && e.internal == '0') {
			sel = window.selectedTag == e.uuid ? ' selected' : '';
			html += '<a id="t_'+e.uuid+'" onclick="selectTag(\''+e.uuid+'\');" class="link'+sel+'">'+e.name+'</a>\n';
		}
	}
	document.getElementById('tags').innerHTML = html;
}

function selectTag(tag) {
	document.getElementById('t_'+selectedTag).className = 'link';
	selectedTag = tag;
	document.getElementById('t_'+selectedTag).className = 'link selected';
	pageChannels(0);
}

function init() {
	self.name = 'mag';
	doPost("api/idnode/load", readConfigs, "enum=1&class=dvrconfig");
	//	doPost("api/epg/content_type/list", readContentGroups, "full=0");
	doPost("api/channeltag/grid", readChannelTags, "");
	doPost("api/channel/grid", readChannels, "");
	append('<span style="float:right;"><a href="mobile.html" target="tvheadend"><img width="50px" src="images/tvheadend128.png" title="'+l('backToMobileUi')+'"></a></span><div id="tags"></div><table style="width:100%;"><tr><td style="width:95%;"><div id="date"><span class="link" onclick="pageDate(-1);">'+icon('images/date_previous.png')+'</span><span id="day"></span><span class="link" onclick="pageDate(1);">'+icon('images/date_next.png')+'</span></td><td style="white-space:nowrap;vertical-align:bottom;"><a class="link" onclick="cols(1);">'+icon('images/layout_add.png')+'</a><a class="link" onclick="cols(-1);">'+icon('images/layout_delete.png')+'</a></td></tr></table><table id="epg"></table>');
	initTable();
	initEpg();
	setInterval(function() { showCurrent(); }, 10*1000);

	var swipeh = new MobiSwipe("epg");
	swipeh.direction = swipeh.HORIZONTAL;
	swipeh.onswiperight = function() { pageChannels(-1); };
	swipeh.onswipeleft = function() { pageChannels(1); };
}

function cols(delta) {
	numChannels += delta;
	if (numChannels < 1) numChannels=1;
	initTable();
	initEpg();
	prefs.data.cols = numChannels;
	prefs.save();
}

function initTable() {
	var html = '<tr><th style="width:10px;"><span class="link" onclick="pageChannels(-1);">'+icon('images/resultset_previous.png')+'</span></th>';
	for (var j=0; j<numChannels;j++) {
		html += '<th class="'+(window.blackLogo?'black':'')+'" style="width:'+(100/numChannels)+'%;" id="c_'+j+'"></th>';
	}
	html += '</tr>';
	for (var i=4;i<=24; i+=4) {
		var styleClass = (i/4)%2==0 ? 'even' : 'odd';
		html += '<tr><th class="'+styleClass+'">'+i+':00</th>';
		for (var j=0; j<numChannels;j++) {
			html += '<td class="'+styleClass+'"><table class="inner" id="'+i+'_'+j+'"></table></td>';
		}
		html += '</tr>';
	}
	document.getElementById('epg').innerHTML = html;
}

/**
 Creates a swipe gesture event handler
 */
function MobiSwipe(id) {
	// Constants
	this.HORIZONTAL     = 1;
	this.VERTICAL       = 2;
	this.AXIS_THRESHOLD = 30;  // The user will not define a perfect line
	this.GESTURE_DELTA  = 60;  // The min delta in the axis to fire the gesture

	// Public members
	this.direction    = this.HORIZONTAL;
	this.element      = document.getElementById(id);
	this.onswiperight = null;
	this.onswipeleft  = null;
	this.onswipeup    = null;
	this.onswipedown  = null;
	this.inGesture    = false;

	// Private members
	this._originalX = 0
	this._originalY = 0
	var _this = this;
	// Makes the element clickable on iPhone
	this.element.onclick = function() {void(0)};

	var mousedown = function(event) {
		// Finger press
		//event.preventDefault();
		_this.inGesture  = true;
		_this._originalX = (event.touches) ? event.touches[0].pageX : event.pageX;
		_this._originalY = (event.touches) ? event.touches[0].pageY : event.pageY;
		// Only for iPhone
		if (event.touches && event.touches.length!=1) {
			_this.inGesture = false; // Cancel gesture on multiple touch
		}
	};

	var mousemove = function(event) {
		// Finger moving
		//event.preventDefault();
		var delta = 0;
		// Get coordinates using iPhone or standard technique
		var currentX = (event.touches) ? event.touches[0].pageX : event.pageX;
		var currentY = (event.touches) ? event.touches[0].pageY : event.pageY;

		// Check if the user is still in line with the axis
		if (_this.inGesture) {
			if ((_this.direction==_this.HORIZONTAL)) {
				delta = Math.abs(currentY-_this._originalY);
			} else {
				delta = Math.abs(currentX-_this._originalX);
			}
			if (delta >_this.AXIS_THRESHOLD) {
				// Cancel the gesture, the user is moving in the other axis
				_this.inGesture = false;
			}
		}

		// Check if we can consider it a swipe
		if (_this.inGesture) {
			if (_this.direction==_this.HORIZONTAL) {
				delta = Math.abs(currentX-_this._originalX);
				if (currentX>_this._originalX) {
					direction = 0;
				} else {
					direction = 1;
				}
			} else {
				delta = Math.abs(currentY-_this._originalY);
				if (currentY>_this._originalY) {
					direction = 2;
				} else {
					direction = 3;
				}
			}

			if (delta >= _this.GESTURE_DELTA) {
				// Gesture detected!
				var handler = null;
				switch(direction) {
				case 0: handler = _this.onswiperight; break;
				case 1: handler = _this.onswipeleft; break;
				case 2: handler = _this.onswipedown; break;
				case 3: handler = _this.onswipeup; break;
				}
				if (handler!=null) {
					// Call to the callback with the optional delta
					handler(delta);
				}
				_this.inGesture = false;
			}

		}
	};


	// iPhone and Android's events
	this.element.addEventListener('touchstart', mousedown, false);
	this.element.addEventListener('touchmove', mousemove, false);
	this.element.addEventListener('touchcancel', function() {
		_this.inGesture = false;
	}, false);

	// We should also assign our mousedown and mousemove functions to
	// standard events on compatible devices
}

