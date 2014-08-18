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
var cancelRecordingId;
var cancelRecordingStart;
var cancelRecordingChannel;
var recordChannel;
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
		var selected = (e.identifier == '') ? ' selected="selected"' : '';
		window.configSelect += '<option value="'+e.identifier+'"'+selected+'>'+e.name+'</option>';
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
		channelNameToId[e.name] = e.chid;
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
	var chid = undefined;
	for (var i in response.entries) {
		var e = response.entries[i];
		chid = e.channelid;
		if (channelToColumn[chid] != undefined) {
			var start = new Date(e.start*1000);
			var box = start.getHours();
			while (box % 4 > 0)
				box--;
			if (box == 0) box = 24;
			var refDay = new Date(start.getTime()-window.hourOffset*60*60*1000);
			if (refDay.getDate() == selectedDay.getDate() && refDay.getMonth() == selectedDay.getMonth()) {
				var td = document.getElementById(box+'_'+window.channelToColumn[e.channelid]); 
				var xclass = nvl(e.schedstate);
				var yclass = (start.getHours() == 20 || start.getHours() == 21)  && e.duration > 60*60 ? 'primetime' : '';
				var add = e.schedstate != undefined ? '<br />&nbsp;' : '';
				var epis = e.episode != undefined ? ' <span class="episode">'+e.episode+'</span>' : '';
				var html = '<tr class="item" start="'+e.start+'" duration="'+e.duration+'"><td class="time '+xclass+'">' + getTimeFromTimestamp(e.start) + add + '</td>\n<td class="content '+yclass+'" id="e_'+e.id+'"><div class="title"><a onclick="showHide(\'e_'+e.id+'\');">'+e.title+epis+'</a></div><div class="subtitle" onclick="showHide(\'e_'+e.id+'\');">'+nvl(e.subtitle)+'</div><div onclick="showHide(\'e_'+e.id+'\');" class="description">'+nvl(e.description)+'</div><div class="duration">'+getDuration(e.duration)+l('hour.short')+' &mdash; '+getTimeFromTimestamp(e.start+e.duration)+'</div><div class="action">';
				if (e.schedstate == 'scheduled' || e.schedstate == 'recording')
					html += '<input type="button" value="'+l('cancel')+'" onclick="cancel('+e.id+', \''+e.start+'\',\''+e.channel+'\');" />';
				else
					html += '<form>'+configSelect + '<br /><input type="button" value="'+l('record')+'" onclick="record('+e.id+', this, \''+e.channel+'\');"/></form>';
				html += '</div></td></tr>';
				td.innerHTML += html;
			}
		}
	}
	window.mutex[response.param] = undefined;
	showCurrent();
	if (chid)
		window.lastEpgResponse[chid] = response;
}

function showCurrent() {
	var elems = document.getElementsByClassName('item');
	for (var i=0; i<elems.length; i++) {
		var elem = elems[i];
		elem.className = (parseInt(elem.getAttribute('start'))*1000 <= (new Date()).getTime() && 
				(parseInt(elem.getAttribute('start'))+parseInt(elem.getAttribute('duration')))*1000 >= (new Date()).getTime()) ? 'item current' : 'item';
	}
}

function cancel(id, starttime, channel) {
	var start = 0;
	var limit = 20;
	var params = 'start='+start+'&limit='+limit;
	cancelRecordingId = id;
	cancelRecordingStart = starttime;
	cancelRecordingChannel = channel;
	doGet('dvrlist_upcoming?'+params, readRecordingsAndCancelRecording);
}

function readRecordingsAndCancelRecording(response) {
	for (var i in response.entries) {
		var e = response.entries[i];
		if (e.start == window.cancelRecordingStart && e.channel == window.cancelRecordingChannel) {
			var params = 'entryId='+e.id+'&op=cancelEntry';
			doPostWithParam("dvr", readCancelEpg, params);
			return;
		}
	}
	alert(l('recordingEntryNotFound'));
}

function record(id, button, channel) {
	var params = 'eventId='+id+'&op=recordEvent&config_name='+button.form.config.value;
	recordChannel = channel;
	doPostWithParam("dvr", readRecordEpg, params, id);
}

function readCancelEpg(response) {
	if (response.success == 1) {
		lastEpgResponse[channelNameToId[cancelRecordingChannel]] = undefined;
		initEpg();
	}
	else {
		alert(l('errorCreatingOrDeleteRecordingEntry'));
	}
}

function readRecordEpg(response) {
	if (response.success == 1) {
		lastEpgResponse[channelNameToId[recordChannel]] = undefined;
		initEpg();
	}
	else {
		alert(l('errorCreatingOrDeleteRecordingEntry'));
	}
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
		doPostWithParam("epg", readEpg, 'start=0&limit=200&channel='+encodeURIComponent(channel), channel);
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
					var html = '<div><span class="link" onclick="showHide(\'s_'+(cnt-channelOffset)+'\');">'+image(ch.ch_icon, 'middle',50,window.blackLogo) + ch.name + '</span>';
					if (cnt-channelOffset==numChannels-1) {
						html += '<span class="link" style="float:right;" onclick="pageChannels(+1);">'+icon('images/resultset_next.png')+'</span>';
					}
					var streamUrl = window.location.protocol+'//'+window.location.host+'/stream/channelid/'+ch.chid;
					html += '</div><div id="s_'+(cnt-channelOffset)+'" class="stream">';
					html += '<div><a target="_blank" href="'+streamUrl+'"><button>HTTP</button></a></div>';
					html += '<div><a target="_blank" href="buzzplayer://'+streamUrl+'"><button>Buzzplayer</button></a></div></div>';
					document.getElementById('c_'+(cnt-channelOffset)).innerHTML = html; 
					channelToColumn[ch.chid] = cnt-channelOffset;
					if (lastEpgResponse[ch.chid])
						readEpg(lastEpgResponse[ch.chid]);
					else
						loadEpgByChannel(ch.name);
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
	var html = icon('../icons/tag_blue.png')+'<a id="t_" onclick="selectTag(\'\');" class="link'+sel+'">'+l('allChannels')+'</a>';
	for (var i=0; i<response.entries.length; i++) {	
		var e = response.entries[i];
		if (e.enabled == '1' && e.internal == '0') {
			sel = window.selectedTag == e.id ? ' selected' : '';
			html += '<a id="t_'+e.id+'" onclick="selectTag('+e.id+');" class="link'+sel+'">'+e.name+'</a>\n';
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
	doPost("confignames", readConfigs, "op=list");
	loadStandardTable("channeltags", readChannelTags);
	doPost("channels", readChannels, "op=list");
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
		html += '<th style="width:'+(100/numChannels)+'%;" id="c_'+j+'"></th>';
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

