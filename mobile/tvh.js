var days = new Array(l('sunday.short'), l('monday.short'), l('tuesday.short'), l('wednesday.short'), l('thursday.short'), l('friday.short'), l('saturday.short'), l('sunday.short') );
var longdays = new Array(l('sunday'), l('monday'), l('tuesday'), l('wednesday'), l('thursday'), l('friday'), l('saturday'), l('sunday') );
var priorities = new Array('important', 'high', 'normal', 'low', 'unimportant');
var plusMinusSigns = new Array('⊕⊕', '⊕', '', '⊖', '⊖⊖');
var contentGroups = new Array();
var configs = new Array();
var channelTags = new Array();
var channels = new Array();
var activeInput = new Array();
var selectedLink = null;
var channelIcons = new Array();

function l(key) {
	var fallback = 'en';
	var lang = navigator.language.substring(0,2);
	if (i18nstrings[lang] != undefined && i18nstrings[lang][key] != undefined)
		return i18nstrings[lang][key];
	else if (i18nstrings[fallback][key] != undefined)
		return i18nstrings[fallback][key];
	else
		return key;
}

function plusMinus(prio) {
	for (var i in priorities) {
		if (priorities[i] == prio)
			return '<span class="plusminus">'+plusMinusSigns[i]+'</span>';
	}
	return '';
}

function showSelector(type, input) {
	activeInput[type] = input;
	var as = document.getElementById(type+'Selector').getElementsByTagName('a');
	selectedLink = null;
	for (var i in as) {
		if (as[i].tagName != undefined) {
			var selected = (selectedLink == null) &&
				((input.getAttribute('code') != undefined && as[i].getAttribute('code') == input.getAttribute('code')) ||
				(input.getAttribute('code') == undefined && as[i].innerHTML == input.value));
			as[i].parentNode.className = selected ? 'selected' : '';
			if (selected) selectedLink = as[i];
		}
	}
	iui.showPageById(type+'Selector');
	setTimeout(function() { if (selectedLink)selectedLink.scrollIntoView(); }, 600);
}
function selectItem(type, a) {
	a.parentNode.className = 'selected';
	if (activeInput[type].getAttribute('code') != undefined) {
		activeInput[type].setAttribute('code', a.getAttribute('code'));
	}
	activeInput[type].value = a.innerText;
	iui.goBack();
}

function nvl(val) {
	return val != undefined ? val : '';
}

function getAutomaticRecorderForm(e) {
	divs = '';
	divs += '<form id="ar_' + e.id + '" title="' + nvl(e.title) + '" class="panel">';
	divs += '<fieldset>';
	divs += '<div class="row"><label>'+l('title')+'</label><input type="text" name="titel" value="' + nvl(e.title) + '" /></div>';
	divs += '<div class="row"><label>'+l('enabled')+'</label><div id="enabled" class="toggle" onclick="return;" name="enabled" toggled="'+(e.enabled ? 'true' : 'false') + '"><span class="thumb"></span><span class="toggleOn">'+l('yes')+'</span><span class="toggleOff">'+l('no')+'</span></div></div>';
	divs += '</fieldset>';
	divs += '<fieldset>';
	divs += '<div class="row"><label>'+l('channel')+'</label><input type="text" code="' + nvl(e.channel) + '" readonly="readonly" name="channel" value="' + nvl(e.channel) + '" onclick="showSelector(\'channel\', this);" /></div>';
	divs += '<div class="row"><label>'+l('tag')+'</label><input type="text" code="' + nvl(e.tag) + '" readonly="readonly" name="tag" value="' + nvl(e.tag) + '" onclick="showSelector(\'tag\',this);" /></div>';
	divs += '<div class="row"><label>'+l('genre')+'</label><input type="text" code="'+nvl(e.contenttype)+'" readonly="readonly" name="contenttype" value="' + nvl(contentGroups[e.contenttype]) + '" onclick="showSelector(\'genre\',this);" /></div>';
	divs += '<div class="row"><label>'+l('config')+'</label><input type="text" code="' + nvl(e.config_name) + '" readonly="readonly" name="config_name" value="' + nvl(e.config_name) + '" onclick="showSelector(\'config\',this);" /></div>';
	divs += '</fieldset>';
	divs += '<fieldset>';
	for (var d=1; d<=7; d++) {
		divs += '<div class="row"><label>'+longdays[d]+'</label><div class="toggle" onclick="return;" name="enabled" toggled="'+(e.weekdays.indexOf(''+d)>=0) + '"><span class="thumb"></span><span class="toggleOn">'+days[d]+'</span><span class="toggleOff">'+days[d]+'</span></div></div>';
	}
	var starting = e.approx_time == 0 ? l('any') : getTimeFromMinutes(e.approx_time); 
	divs += '<div class="row"><label>'+l('startingAround')+'</label><input type="text" code="'+nvl(e.approx_time)+'" readonly="readonly" name="startingAround" value="' + starting + '" onclick="showSelector(\'starting\',this);" /></div>';
	divs += '<div class="row"><label>'+l('priority')+'</label><input type="text" code="'+nvl(e.pri)+'" readonly="readonly" name="priority" value="' + (e.pri != undefined ? l('prio.'+e.pri) : '') + '" onclick="showSelector(\'priority\',this);" /></div>';
	divs += '</fieldset>';
	divs += '<fieldset>';
	divs += '<div class="row"><label>'+l('createdBy')+'</label><input type="text" name="creator" value="' + nvl(e.creator) + '" /></div>';
	divs += '<div class="row"><label>'+l('comment')+'</label><input type="text" name="comment" value="' + nvl(e.comment) + '" /></div>';
	divs += '</fieldset>';
	divs += '<a class="whiteButton" href="javascript:saveAutomaticRecorder(\''+e.id+'\');">'+l('save')+'</a>';
	if (e.id != 'new') {
		divs += '<p>&nbsp;</p><a class="redButton" href="javascript:deleteAutomaticRecorder(\''+e.id+'\');">'+l('delete')+'</a>';
	}
	divs += '</form>';
	return divs;
}

function getTimeFromMinutes(minutes) {
	var m = minutes % 60;
	var h = (minutes-m) / 60;
	var ht = (h < 10 ? '0' : '') + h;
	var mt = (m < 10 ? '0' : '') + m;
	return ht + ':' + mt;
}

function getDuration(seconds) {
	var minutes = seconds/60;
	var m = Math.round(minutes % 60);
	var h = Math.round((minutes-m) / 60);
	var mt = (m < 10 ? '0' : '') + m;
	return h + ':' + mt;
}

function setProgressBar(elem, width, percent) {
	elem.innerHTML = getProgressBar(width, percent);
}

function getProgressBar(width, percent) {
	percent = (percent < 0) ? 0 : (percent > 100 ? 100 : percent);
	var left = Math.round(percent/100*width);
	var right = width-left;
	var middle = true;
	if (left < 2) {
		left+=2;
		middle = false;
	}
	if (right < 2) {
		right += 2;
		middle = false;
	}
	var html = '<img alt="'+percent+'%" src="images/pb_trans.png" class="pb left" height="10px" width="'+left+'px" />';
	if (middle)
		html += '<img alt="'+percent+'%" src="images/pb_middle.png" class="pb" height="10px" width="2px" />';
	html += '<img alt="'+percent+'%" src="images/pb_trans.png" class="pb right" height="10px" width="'+right+'px" />';
	return html;
}

function readSaveAutomaticRecorder(response) {
	loadAutomaticRecorderList();
	iui.goBack();
}

function createAutomaticRecorder(response) {
	document.getElementById('ar_new').id = 'ar_'+response.id;
	saveAutomaticRecorder(response.id);
}

function readDeleteAutomaticRecorder(response) {
	loadAutomaticRecorderList();
	iui.goBack();
}

function deleteAutomaticRecorder(id) {
	if (confirm(l('reallyDeleteItem'))) {
		var entries = new Array();
		entries[0] = id;
		var params = "entries="+JSON.stringify(entries)+"&op=delete&table=autorec";
		doPost("tablemgr", readDeleteAutomaticRecorder, params);
	}
}

function saveAutomaticRecorder(id) {
	if (id == 'new') {
		doPost("tablemgr", createAutomaticRecorder, "op=create&table=autorec");
		return;
	}
	var form = document.getElementById('ar_'+id);
	var entries = new Array();
	entries[0] = new Object();
	entries[0].id = id;
	entries[0].title = form.titel.value;
	entries[0].enabled = form.getElementsByClassName('toggle')[0].getAttribute('toggled') == "true";
	entries[0].tag = form.tag.getAttribute('code');
	entries[0].channel = form.channel.getAttribute('code');
	entries[0].weekdays = '';
	for (var i=1; i<=7; i++) {
		if (form.getElementsByClassName('toggle')[i].getAttribute('toggled') == "true")
			entries[0].weekdays += (entries[0].weekdays.length > 0 ? ',' : '') + i; 
	}
	entries[0].contenttype = form.contenttype.getAttribute('code');
	entries[0].config_name = form.config_name.getAttribute('code');
	entries[0].approx_time = form.startingAround.getAttribute('code');
	entries[0].pri = form.priority.getAttribute('code');
	entries[0].creator = form.creator.value;
	entries[0].comment = form.comment.value;
	var params = "entries="+JSON.stringify(entries)+"&op=update&table=autorec";
	doPost("tablemgr", readSaveAutomaticRecorder, params);
}

function loadAbout() {
	var http = new XMLHttpRequest();  	
	var url = "../../about.html";
	http.open("GET", url, true);

	http.onreadystatechange = function() {
		if(http.readyState == 4 && http.status == 200) {
			document.getElementById('about').innerHTML = http.responseText.replace('src="', 'src="../../');
		}
	};

	http.send(null);
}

function readContentGroups(response) {
	var sel = '';
	for (var i=0; i<response.entries.length; i++) {	
		var e = response.entries[i];
		window.contentGroups[e.code] = e.name;
		sel += '<li><a href="javascript:null;" code="'+e.code+'" onclick="selectItem(\'genre\',this);">'+(e.name?e.name:'&nbsp;')+'</a></li>';
	}
	document.getElementById('genreSelector').innerHTML = sel;
}

function readConfigs(response) {
	window.configs = response.entries;
	var sel='';
	for (i in response.entries) {
		var e = response.entries[i];
		sel += '<li><a href="javascript:null;" code="'+e.identifier+'" onclick="selectItem(\'config\',this);">'+e.name+'</a></li>';
	}
	document.getElementById('configSelector').innerHTML = sel;
}

function loadStandardTable(table, callback) {
	doPost("tablemgr", callback, "op=get&table="+table);
}

function doPost(path, callback, params) {
	doPostWithParam(path, callback, params, null);
}

function readSubscriptions(response) {
	var html = '';
	var app = '';
	for (var i in response.entries) {	
		var e = response.entries[i];
		html += '<li><a href="#sub_'+e.id+'">'+e.channel+'<div class="small">'+e.hostname+' &mdash; '+e.title+'<br>'+e.service+'</div></a></li>';
		app += getSubscriptionForm(e);
	}
	document.getElementById('subscriptions').innerHTML = html;
	append(app);
}

function readAdapters(response) {
	var html = '';
	var app = '';
	for (var i in response.entries) {	
		var e = response.entries[i];
		html += '<li><a href="#adapter_'+e.identifier+'">'+e.name+'<div class="small">'+e.path+' &mdash; '+e.services+' '+l('services')+' &mdash; '+e.muxes+' ' + l('muxes')+'</div></a></li>';
		app += getAdapterForm(e);
	}
	document.getElementById('adapters').innerHTML = html;
	append(app);
}

function loadSubscriptions() {
	doGet('subscriptions', readSubscriptions);
}

function loadAdapters() {
	doGet('tv/adapter', readAdapters);
}

function doPostWithParam(path, callback, params, ownParam) {
	var http = new XMLHttpRequest();  	
	http.open("POST", "../../"+path, true);
	http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	http.setRequestHeader("Content-length", params.length);
	http.setRequestHeader("Connection", "close");
	http.ownParam = ownParam;

	http.onreadystatechange = function() {
		if(http.readyState == 4 && http.status == 200) {
			var response = eval("[" + http.responseText + "]");
			response[0].param = http.ownParam;
			callback(response[0]);
		}
	};

	http.send(params);
}

function doGet(path, callback) {
	var http = new XMLHttpRequest();  	
	http.open("GET", "../../"+path, true);
	http.path = path;

	http.onreadystatechange = function() {
		if(http.readyState == 4 && http.status == 200) {
			var response = eval("[" + http.responseText + "]");
			response[0].path = http.path;
			callback(response[0]);
		}
	};

	http.send(null);
}

function readChannelTags(response) {
	var html = new Array();
	html[0] = '<li><a href="#tag_0" onclick="showChannelInfos(0);">'+l('allChannels')+'</a></li>';
	var ins = '';
	ins += '<ul id="tag_0" title="'+l('allChannels')+'"></ul>';
	var sel = new Array();
	sel[0] = '<li><a href="javascript:null;" code="" onclick="selectItem(\'tag\',this);">'+l('any')+'</a></li>';
	for (var i=0; i<response.entries.length; i++) {	
		var e = response.entries[i];
		window.channelTags[e.id] = e.name;
		html[e.id] = '<li><a href="#tag_'+e.id+'" onclick="showChannelInfos('+e.id+');">';
		html[e.id] += image(e.icon) + e.name+'</a></li>';
		ins += '<ul id="tag_'+e.id+'" title="'+e.name+'"></ul>';
		sel[e.id] = '<li><a href="javascript:null;" code="'+e.name+'" onclick="selectItem(\'tag\',this);">'+e.name+'</a></li>';
	}
	var all = '';
	for (var i in html)
		all += html[i];
	document.getElementById('tags').innerHTML = all;
	var all2 = '';
	for (var i in sel)
		all2 += sel[i];
	document.getElementById('tagSelector').innerHTML = all2;
	append(ins);
	doPost("channels", readChannels, "op=list");
}

function getRecordingForm(e, type) {
	var divs = getIntro(e);
	divs += '<fieldset>';
	//divs += textField('title', e.title, true);
	divs += textField('episode', e.episode, true);
	divs += textField('channel', e.channel, true);
	divs += textField('priority', (e.pri != undefined ? l('prio.'+e.pri) : ''), true);
	divs += textField('start', getDateTimeFromTimestamp(e.start, true), true);
	divs += textField('duration', getDuration(e.duration)+l('hour.short'), true);
	divs += textField('config', e.config_name, true);
	var status = l('status.'+e.status)!='status.'+e.status ? l('status.'+e.status) : e.status;
	divs += textField('status', status, true);
	divs += '</fieldset>';
	if (e.schedstate == 'scheduled' || e.schedstate == 'recording')
		divs += '<a class="redButton" href="javascript:cancelEntry('+e.id+', \''+type+'\');">'+l('cancel')+'</a>';
	else if (type == 'failed')
		divs += '<a class="redButton" href="javascript:deleteEntry('+e.id+', \''+type+'\');">'+l('delete')+'</a>';
	if (document.getElementById('rec_'+e.id) != null) {
		document.getElementById('rec_'+e.id).innerHTML = divs;
		return '';
	}
	else {
		return divs += '<form id="rec_' + e.id + '" title="' + e.title + '" class="panel">' + divs + '</form>';
	}
}

function getSubscriptionForm(e) {
	divs = '';
	divs += '<fieldset>';
	divs += textField('title', e.title, true);
	divs += textField('channel', e.channel, true);
	divs += textField('hostname', e.hostname, true);
	divs += textField('status', e.state, true);
	divs += textField('start', getDateTimeFromTimestamp(e.start, true), true);
	divs += '</fieldset>';
	if (document.getElementById('sub_'+e.id) != null) {
		document.getElementById('sub_'+e.id).innerHTML = divs;
		return '';
	}
	else {
		return '<form id="sub_' + e.id + '" title="' + e.channel + '" class="panel">' + divs + '</form>';
	}
}

function getAdapterForm(e) {
	divs = '';
	divs += '<fieldset>';
	divs += textField('name', e.name, true);
	divs += textField('path', e.path, true);
	divs += textField('devicename', e.devicename, true);
	divs += textField('deliverysystem', e.deliverySystem, true);
	divs += textField('services', e.services, true);
	divs += textField('muxes', e.muxes, true);
	divs += textField('signal', e.signal, true);
	divs += '</fieldset>';
	if (document.getElementById('adapter_'+e.id) != null) {
		document.getElementById('adapter_'+e.id).innerHTML = divs;
		return '';
	}
	else {
		return '<form id="adapter_' + e.identifier + '" title="' + e.name + '" class="panel">' + divs + '</form>';
	}
}

function textField(labelKey, value, readonly) {
	return '<div class="row"><label>'+l(labelKey)+'</label><input type="text"'+(readonly?' readonly="readonly"':'')+' value="' + nvl(value) + '" /></div>';
}

function getIntro(e) {
	var divs = '';
	if (e.chicon != undefined)
		divs += '<img src="'+e.chicon+'" width="80px" align="right" />';
	divs += '<h1>'+e.title+'</h1>';
	if (e.subtitle != undefined)
		divs += '<h2>'+e.subtitle+'</h2>';
	divs += '<p class="description">'+e.description+'</p>';
	return divs;
}

function getEpgForm(e) {
	var divs = getIntro(e);
	divs += '<fieldset>';
	//divs += textField('title', e.title, true);
	//divs += textField('subtitle', e.subtitle, true);
	divs += textField('episode', e.episode, true);
	divs += textField('channel', e.channel, true);
	//divs += '<div class="row"><label>'+l('description')+'</label><p class="description">' + nvl(e.description) + '</p></div>';
	divs += textField('start', getDateTimeFromTimestamp(e.start, true), true);
	divs += textField('duration', getDuration(e.duration)+l('hour.short'), true);
	divs += textField('genre', contentGroups[e.contenttype], true);
	if (e.schedstate != "") {
		divs += textField('status', contentGroups[e.schedstate], true);
	}
	divs += '</fieldset>';
	divs += '<!-- a class="whiteButton" href="javascript:formname.submit()">'+l('save')+'</a>';
	divs += '<p>&nbsp;</p -->';
	if (e.schedstate == 'scheduled' || e.schedstate == 'running')
		divs += '<a class="redButton" href="javascript:cancelEpg('+e.start+',\''+e.channel+'\');">'+l('cancel')+'</a>';
	else {
		divs += '<a class="whiteButton" href="javascript:recordEpg('+e.id+',\''+e.channel+'\');">'+l('record')+'</a>';
		divs += '<fieldset>';
		divs += '<div class="row"><label>'+l('config')+'</label><input type="text" readonly="readonly" code="" name="config" value="" onclick="javascript:showSelector(\'config\',this);" /></div>';
		//divs += '<div class="row"><label>Priority</label><input type="text" name="priority" value="normal" onclick="javascript:showSelector(\'priority\',this);" /></div>';
		divs += '</fieldset>';
	}
	if (document.getElementById('epg_'+e.id) != null) {
		document.getElementById('epg_'+e.id).innerHTML = divs;
		return '';
	}
	else {
		return '<form id="epg_' + e.id + '" title="' + e.title + '" class="panel">' + divs + '</form>';
	}
}

function readRecordEpg(response) {
	if (response.success == 1) {
		loadRecordings('upcoming');
		reloadChannelEpg(response.param);
	}
	else {
		alert(l('errorCreatingOrDeleteRecordingEntry'));
	}
}

function showChannelInfos(tag) {
	var as = document.getElementById('tag_'+tag).getElementsByTagName('A');
	for (var i in as) {
		if (as[i].tagName != undefined && as[i].tagName.toLowerCase() == 'a') {
			var chid = as[i].getAttribute('href').replace("#channel_", "");
			var imgs = as[i].getElementsByClassName('icon');
			if (imgs.length > 0 && channelIcons[chid] != undefined && imgs[0].src != channelIcons[chid]) {
				imgs[0].src = channelIcons[chid];
			}
			var curr = as[i].getElementsByClassName('small');
			if (curr.length > 0) {
				var html = '';
				if (current[chid] != undefined) {
					for (var i in current[chid]) {
						var e = current[chid][i];
						if (new Date() > new Date(e.start*1000) && new Date() <= new Date((e.start+e.duration)*1000)) {				
							var percent = Math.round((((new Date()).getTime()/1000)-e.start)/(e.duration)*100);
							html += getTimeFromTimestamp(e.start);
							html += getProgressBar(200, percent);
							html += getTimeFromTimestamp(e.start+e.duration)
							html += '<br /><b>'+e.title;
							if (e.episode)
								html += '<span class="epsiode">'+e.episode+'</span>';
							html += '</b>';
							html += (e.subtitle!=undefined&&e.title!=e.subtitle?'<br />'+e.subtitle:'');
						}
					}
				}
				curr[0].innerHTML = html;
			}
		}
	}
}

function reloadChannelEpg(channel) {
	for (var i in channels) {	
		var e = channels[i];
		if (e.name == channel) {
			loadEpg(e.chid, channel, true);
		}
	}
}

function cancelEpg(start, channel) {
	for (var i in upcoming.entries) {
		var e = upcoming.entries[i];
		if (e.start == start && e.channel == channel) {
			var params = 'entryId='+e.id+'&op=cancelEntry';
			doPostWithParam("dvr", readRecordEpg, params, channel);
			return;
		}
	}
	alert(l('recordingEntryNotFound'));
}

function recordEpg(id, channel) {
	var form = document.getElementById('epg_'+id);
	var params = 'eventId='+id+'&op=recordEvent&config_name='+form.config.value;
	doPostWithParam("dvr", readRecordEpg, params, channel);
}

function append(html) {
	document.getElementById('last').outerHTML = html + document.getElementById('last').outerHTML;
}

function getDateTimeFromTimestamp(timestamp, showDay) {
	var date = new Date(timestamp*1000);
	return getDate(date, showDay)+' '+getTime(date);
}

function getDateFromTimestamp(timestamp, showDay) {
	var date = new Date(timestamp*1000);
	return getDate(date, showDay);
}

function getTimeFromTimestamp(timestamp) {
	var date = new Date(timestamp*1000);
	return getTime(date);
}

function z(s){s=''+s;return s.length>1?s:'0'+s;}

function getDate(d, showDay)
{
	var day = days[d.getDay()];
	var y=d.getFullYear(),m=d.getMonth()+1,dd=d.getDate();
	f=l('dateFormat');
	f=f.replace(/yyyy/,y);f=f.replace(/yy/,String(y).substr(2));
	f=f.replace(/MM/,z(m));f=f.replace(/M/,m);
	f=f.replace(/dd/,z(dd));f=f.replace(/d/,dd);
	return (showDay?day+' ':'')+f;
}

function getTime(d)
{
	return z(d.getHours())+":"+z(d.getMinutes());
}

function readRecordings(response) {
	var which = response.path.replace("dvrlist_", "");
	if (which.indexOf('?')>=0)
		which = which.substring(0, which.indexOf('?'));
	var list = document.getElementById(which);
	var html = '';
	var divs = '';
	for (var i in response.entries) {	
		var e = response.entries[i];
		var info = getDateTimeFromTimestamp(e.start, true) + ' (' + getDuration(e.duration) + l('hour.short')+') &mdash; '+plusMinus(e.pri)+' '+e.channel;
		html += '<li><a href="#rec_' + e.id + '">';
		if (e.schedstate == 'recording')
			html += icon('../icons/rec.png', '(recording)');
		if (e.schedstate == 'scheduled')
			html += icon('../icons/clock.png', '(scheduled)');
		html += e.title;
		if (nvl(e.episode) != '')
			epg += '<span class="episode">'+e.episode+'</span>';
		html += '<div class="small">'+info+'</div></a></li>';
		divs += getRecordingForm(e, which);
	}
	if (response.totalCount > epgLoaded[which])
		html += '<li><a class="more" href="javascript:loadRecordings(\''+which+'\', false);">'+l('getMore')+'</a></li>';
	if (which == 'upcoming') {
		window.upcoming = response;
	}
	list.childNodes[list.childNodes.length-1].outerHTML = '';
	list.innerHTML += html;
	append(divs);
}

function loadRecordings(which, reload) {
	//doGet("dvrlist_"+which, readRecordings);
	var start = epgLoaded[which] != undefined ? epgLoaded[which] : 0;
	var limit = 20;
	if (reload) {
		limit = start;
		start=0;
		if (limit == 0) limit = 20;
		var ch = document.getElementById(which);
		ch.innerHTML = '<li>'+l('loading')+'</li>';
	}
	var params = 'start='+start+'&limit='+limit;
	epgLoaded[which] = start+limit;
	doGet("dvrlist_"+which+'?'+params, readRecordings);
}

function imageClass(url, id) {
	if (url)
		return '<img class="'+id+'" src="'+url+'" align="top" width="35px" />';
	else
		return '';
}

function image(url) {
	if (url)
		return '<img src="'+url+'" align="top" width="35px" />';
	else
		return '';
}

function icon(path) {
	if (path)
		return '<img src="'+path+'" height="16px" width="16px" />';
	else
		return '';
}

function readChannels(response) {
	window.channels = response.entries;
	var sel = new Array();
	sel[0] = '<li><a href="javascript:null;" code="" onclick="selectItem(\'channel\',this);">'+l('any')+'</a></li>';
	var app = '';
	var tagHtml = new Array();
	for (var i in response.entries) {
		var e = response.entries[i];
		var no = e.number != undefined ? '<span class="chno round">'+e.number+'</span>' : '';
		window.channelIcons[e.chid] = e.ch_icon;
		html = '<li><a href="#channel_' + e.chid + '" onclick="loadEpg('+e.chid+', \''+e.name+'\', true);">';
		html += imageClass('images/pb_trans.png', 'icon') + no + e.name + '<div class="small"></div></a></li>';
		var sortNo = e.number!=undefined?e.number:9999;
		var tags = ("0,"+e.tags).split(",");
		for (var j in tags) {
			if (tags[j] != '') {
				if (tagHtml[tags[j]] == undefined) tagHtml[tags[j]] = new Array();
				if (tagHtml[tags[j]][sortNo] == undefined) tagHtml[tags[j]][sortNo] = '';
				tagHtml[tags[j]][sortNo] += html;
			}
		}
		if (sel[sortNo] == undefined) sel[sortNo] = '';
		app += '<ul id="channel_'+e.chid+'" title="'+e.name+'"><li>'+l('loading')+'</li></ul>';
		sel[sortNo] += '<li><a href="javascript:null;" code="'+e.name+'" onclick="selectItem(\'channel\',this);">'+e.name+'</a></li>';
	}
	for (var i in tagHtml) {
		var tagch = '';
		for (var j in tagHtml[i])
			tagch += tagHtml[i][j];
		document.getElementById('tag_'+i).innerHTML = tagch;
	}
	var sels = '';
	for (var i in sel)
		sels += sel[i];
	append(app);
	document.getElementById('channelSelector').innerHTML = sels;
	loadCurrent();
}

function readCancelEntry(response) {
	if (response.success == 1) {
		if (response.param != undefined) {
			loadRecordings(response.param, true);
			iui.showPageById(response.param);
		}
		else
			iui.showPageById('home');
	}
	else {
		alert(l('errorCancellingEntry'));
	}
}

function readDeleteEntry(response) {
	if (response.success == 1) {
		if (response.param != undefined) {
			loadRecordings(response.param, true);
			iui.showPageById(response.param);
		}
		else
			iui.showPageById('home');
	}
	else {
		alert(l('errorDeletingEntry'));
	}
}

function cancelEntry(entryId, type) {
	doPostWithParam('dvr', readCancelEntry, 'entryId='+entryId+'&op=cancelEntry', type);
}

function deleteEntry(entryId, type) {
	if (confirm(l('reallyDeleteItem')))
		doPostWithParam('dvr', readDeleteEntry, 'entryId='+entryId+'&op=deleteEntry', type);
}

var lastSearch = '';
function readEpg(response) {
	var html = '';
	var ins = '';
	var chid = response.param;
	if (response.entries.length > 0) {
		for (var i in response.entries) {
			var e = response.entries[i];
			var day = getDateFromTimestamp(e.start, true);
			if (lastEpgDay == undefined || lastEpgDay != day) {
				html += '<li class="group">'+day+'</li>';
				lastEpgDay = day;
			}
			var epg = '';
			if (e.schedstate == 'scheduled')
				epg += icon('../icons/clock.png', '(scheduled)');
			else if (e.schedstate == 'recording')
				epg += icon('../icons/rec.png', '(recording)');
			else if (e.schedstate == 'completed')
				epg += icon('../icons/television.png', '(completed)');
			else if (e.schedstate == 'recordingError' || e.schedstate == 'completedError')
				epg += icon('../icons/exclamation.png', '(error)');
			epg += e.title;
			if (nvl(e.episode) != '')
				epg += '<span class="episode">'+e.episode+'</span>';
			epg += '<div class="small">' + getTimeFromTimestamp(e.start);
			if (chid == 's')
				epg += ' &mdash; ' + e.channel;
			if (e.subtitle)
				epg += ' &mdash; ' + e.subtitle;
			epg += '</div>';
			html += '<li><a href="#epg_'+e.id+'">' + epg + '</a></li>';
			ins += getEpgForm(e);
		}
		if (response.totalCount > epgLoaded[chid])
			html += '<li><a class="more" href="javascript:loadEpg(\''+chid+'\', \''+response.entries[0].channel+'\', false);">'+l('getMore')+'</a></li>';
		var ch = document.getElementById('channel_'+chid);
		if (chid == 's')
			ch = document.getElementById('search');
		ch.childNodes[ch.childNodes.length-1].outerHTML = '';
		ch.innerHTML += html;
		append(ins);
	}
	else {
		var ch = document.getElementById('channel_'+chid);
		if (chid == 's')
			ch = document.getElementById('search');
		ch.childNodes[ch.childNodes.length-1].outerHTML = '';
	}
}

var epgLoaded = new Array();
var lastEpgDay = new Array();
function loadEpg(chid, chname, reload) {
	//var start = document.getElementById('channel_'+chid).childNodes.length - 1;
	var start = epgLoaded[chid] != undefined ? epgLoaded[chid] : 0;
	var limit = 20;
	if (reload) {
		limit = start;
		start=0;
		if (limit == 0) limit = 20;
		var ch = document.getElementById('channel_'+chid);
		ch.innerHTML = '<li>'+l('loading')+'</li>';
		lastEpgDay[chid] = '';
	}
	var params = 'start='+start+'&limit='+limit+'&channel='+chname;
	if (chid == 's')
		params = 'start='+start+'&limit='+limit+'&title='+lastSearch;
	epgLoaded[chid] = start+limit;
	doPostWithParam("epg", readEpg, params, chid);
}

function readCurrent(response) {
	for (var i in response.entries) {
		var e = response.entries[i];
		if (current[e.channelid] == undefined)
			current[e.channelid] = new Array();
		var idx = current[e.channelid].length;
		current[e.channelid][idx] = e;
	}
}

var current = new Array();

function loadCurrent() {
	doPost("epg", readCurrent, "start=0&limit="+(channels.length*2));
}

function newAutomaticRecorder() {
	var add = new Object();
	add.id = 'new';
	add.title = '';
	add.creator = '';
	add.comment = '';
	add.weekdays = '1,2,3,4,5,6,7';
	add.enabled = true;
	add.prio = 'normal';
	add.approx_time  = '0';
	return add;
}

function readAutomaticRecorderList(response) {
	var list = document.getElementById('ar');
	var html = '';
	var divs = '';
	html += '<li><a href="#ar_new">'+icon('../icons/add.gif','')+l('newEntry')+'</a></li>';
	divs += getAutomaticRecorderForm(newAutomaticRecorder());
	for (var i in response.entries) {	
		var e = response.entries[i];
		var info = '';
		info += plusMinus(e.pri);
		info += e.channel ? (info.length > 0 ? ' ' : '') + e.channel : '';
		info += e.tag ? (info.length > 0 ? ' &mdash; ' : '') + e.tag : '';
		info += e.contenttype ? (info.length > 0 ? ' &mdash; ' : '') + contentGroups[e.contenttype] : '';
		info += e.config_name ? (info.length > 0 ? ' &mdash; ' : '') + e.config_name : '';
		info += e.approx_time != '' ? (info.length > 0 ? ' &mdash; ' : '') + getTimeFromMinutes(e.approx_time) : '';
		if (e.weekdays != '1,2,3,4,5,6,7') {
			var wds = e.weekdays;
			for (var d=1; d<=7; d++) {
				wds = wds.replace(d, days[d]);
			}
			info += (info.length > 0 ? ' &mdash; ' : '') + wds;
		}
		html += '<li><a' + (e.enabled?'':' class="inactive"')+' href="#ar_' + e.id + '">';
		html += e.enabled ? icon('../icons/tick.png',l('active')):icon('../icons/control_pause.png', l('inactive'));
		html += e.title;
		if (info.length > 0)
			html += '<div class="small padleft">'+info+'</div>';
		html += '</a></li>';
		divs += getAutomaticRecorderForm(e);
		if (document.getElementById('ar_'+e.id) != null)
			document.getElementById('ar_'+e.id).outerHTML = '';
	}
	list.innerHTML = html;
	append(divs);
}

function searchEpg() {
	var tosearch = document.getElementById('searchText').value;
	lastSearch = tosearch;
	var start = epgLoaded['s'] != undefined ? epgLoaded['s'] : 0;
	var limit = 20;
	if (reload) {
		limit = start;
		start=0;
		if (limit == 0) limit = 20;
		var ch = document.getElementById('search');
		ch.innerHTML = '<li>'+l('loading')+'</li>';
		lastEpgDay['s'] = '';
	}
	var params = 'start='+start+'&limit='+limit+'&title='+tosearch;
	epgLoaded['s'] = start+limit;
	doPostWithParam("epg", readEpg, params, 's');
	iui.showPageById('search');
}

function loadAutomaticRecorderList() {
	loadStandardTable("autorec", readAutomaticRecorderList);
}

function initialLoad() {
	doGet("ecglist", readContentGroups);
	doPost("confignames", readConfigs, "op=list");
	loadStandardTable("channeltags", readChannelTags);
	loadRecordings('upcoming', true);
}

function reload(initial) {
	if (initial || location.hash == '#_home' || location.hash == '' || location.hash == '#_tags')
		initialLoad();
	if (location.hash == '#_ar')
		loadAutomaticRecorderList();
	if (location.hash == '#_upcoming')
		loadRecordings('upcoming', true);
	if (location.hash == '#_finished')
		loadRecordings('finished', true);
	if (location.hash == '#_failed')
		loadRecordings('failed', true);
	if (location.hash == '#_about')
		loadAbout();
	if (location.hash == '#_subscriptions')
		loadSubscriptions();
	if (location.hash == '#_adapters')
		loadAdapters();
}

function init() {
	document.getElementById('reloadButton').innerHTML = l('reload');
	var ini = '';
	ini += '<li id="epgGroup" class="group">'+l('electronicProgramGuide')+'</li>';
	ini += '<li><div><input id="searchText" class="round" type="text" name="search" /></div>';
	ini += '<div></div><input id="searchButton" type="button" value="'+l('search')+'" onclick="searchEpg();" style="width:99%;" /></div></li>';
	ini += '<li><a href="#tags">'+icon('../icons/tag_blue.png')+l('tags')+'</a></li>';
	ini += '<li class="group">'+l('digitalVideoRecorder')+'</li>';
	ini += '<li><a href="#upcoming" onclick="loadRecordings(\'upcoming\', true);">'+icon('../icons/clock.png','')+l('upcomingRecordings')+'</a></li>';
	ini += '<li><a href="#finished" onclick="loadRecordings(\'finished\', true);">'+icon('../icons/television.png','')+l('finishedRecordings')+'</a></li>';
	ini += '<li><a href="#failed" onclick="loadRecordings(\'failed\', true);">'+icon('../icons/exclamation.png','')+l('failedRecordings')+'</a></li>';
	ini += '<li><a href="#ar" onclick="loadAutomaticRecorderList();">'+icon('../icons/wand.png','')+l('automaticRecorder')+'</a></li>';
	ini += '<li class="group">'+l('informationStatus')+'</li>';
	ini += '<li><a href="#subscriptions" onclick="loadSubscriptions();">'+icon('../icons/eye.png')+l('subscriptions')+'</a></li>';
	ini += '<li><a href="#adapters" onclick="loadAdapters();">'+icon('../icons/pci.png')+l('adapters')+'</a></li>';
	ini += '<li><a href="#about" onclick="loadAbout();">'+icon('../icons/information.png')+l('about')+'</a></li>';
	ini += '<li><a href="../../extjs.html" target="_blank">'+icon('../htslogo.png')+l('desktopSite')+'</a></li>';
	document.getElementById('home').innerHTML += ini;
	var app = '';
	app += '<ul id="tags" title="'+l('tags')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="ar" title="'+l('automaticRecorder')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="upcoming" title="'+l('upcomingRecordings')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="finished" title="'+l('finishedRecordings')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="failed" title="'+l('failedRecordings')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="subscriptions" title="'+l('subscriptions')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="adapters" title="'+l('adapters')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="about" title="'+l('about')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="search" title="'+l('search')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="tags" title="'+l('tags')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="tags" title="'+l('tags')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="tagSelector" class="selector" title="'+l('tag')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="genreSelector" class="selector" title="'+l('genre')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="prioritySelector" class="selector" title="'+l('priority')+'">';
	for (i in priorities) {
		app += '<li><a href="javascript:null;" code="'+priorities[i]+'" onclick="selectItem(\'priority\',this);">'+l('prio.'+priorities[i])+'</li>';
	}
	app += '</ul>';
	app += '<ul id="startingSelector" class="selector" title="'+l('startingAround')+'">';
	app += '<li><a code="0" href="javascript:null;" onclick="selectItem(\'starting\',this);">'+l('any')+'</a></li>';
	for (var h=0; h<24; h++) {
		for (var m=0; m<60; m+=10) {
			var ms = h*60 + m;
			var ht = (h < 10 ? '0' : '') + h;
			var mt = (m < 10 ? '0' : '') + m;
			var t = ht + ':' + mt;
			app += '<li><a code="'+ms+'" href="javascript:null;" onclick="selectItem(\'starting\',this);">'+t+'</a></li>';
			//divs += '<option value="'+ms+'"'+selected+'>'+ t + '</option>';
		}
	}
	app += '</ul>';
	app += '<ul id="configSelector" class="selector" title="'+l('config')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="channelSelector" class="selector" title="'+l('channel')+'"><li>'+l('loading')+'</li></ul>';
	append(app);
	reload(true);
}