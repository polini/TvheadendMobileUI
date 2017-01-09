var priorities = new Array('important', 'high', 'normal', 'low', 'unimportant', 'notset');
var plusMinusSigns = new Array('⊕⊕', '⊕', '⊙', '⊖', '⊖⊖', '⊗');
var contentGroups = new Array();
var configs = new Array();
var channelTags = new Array();
var channels = new Array();
var activeInput = new Array();
var selectedLink = null;
var channelIcons = new Array();
var endTimes = new Array();
var channelNames = new Array();
var channelTagsLoaded = false;
var channelsLoaded = false;

function layoutFormat(e, type) {
	var ret = layout[type];
	if (e.title == e.subtitle)
		e.subtitle = undefined;
	if (e.disp_subtitle == undefined && e.subtitle != undefined)
		e.disp_subtitle = e.subtitle;
	ret = ret.replace(/%ti/g, nvl(e.disp_title ? e.disp_title : e.title));
	ret = ret.replace(/%ds_su/g, nvl(e.disp_subtitle) != '' ? ' &mdash; '+e.disp_subtitle : '');
	ret = ret.replace(/%su/g, nvl(e.disp_subtitle));
	ret = ret.replace(/%ch/g, nvl(e.channelname ? e.channelname : e.channelName));
	ret = ret.replace(/%ds_ep/g, nvl(e.episode) != '' ? ' &mdash; '+e.episode : '');
	ret = ret.replace(/%ep/g, nvl(e.episode));
	var percent = 0;
	if (e.stop > 0 && e.stop > e.start)
		percent = Math.round((((new Date()).getTime()/1000)-e.start)/(e.stop-e.start)*100);
	ret = ret.replace(/%pb/g, getProgressBar(200, percent));
	ret = ret.replace(/%st/g, getTimeFromTimestamp(e.start));
	ret = ret.replace(/%sdt/g, getDateTimeFromTimestamp(e.start, true));
	ret = ret.replace(/%et/g, getTimeFromTimestamp(e.stop));
	ret = ret.replace(/%edt/g, getDateTimeFromTimestamp(e.stop, true));
	ret = ret.replace(/%du/g, getDuration(e.stop-e.start)+l('hour.short'));
	ret = ret.replace(/%pr/g, plusMinus(e.pri));
	ret = ret.replace(/%ds/g, ' &mdash; ');
	ret = ret.replace(/%br/g, '<br />');
	return ret;
}

function plusMinus(prio) {
	for (var i in priorities) {
		if (priorities[i] == prio || i == prio)
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
	activeInput[type].value = document.all ? a.innerText : a.textContent;
	iui.goBack();
}

function getAutomaticRecorderForm(e) {
	var divs = '';
	divs += '<fieldset>';
	divs += '<div class="row"><label>'+l('title')+'</label><input type="text" name="titel" value="' + nvl(e.title) + '" /></div>';
	divs += '<div class="row"><label>'+l('enabled')+'</label><div id="enabled" class="toggle" onclick="return;" name="enabled" toggled="'+(e.enabled ? 'true' : 'false') + '"><span class="thumb"></span><span class="toggleOn">'+l('yes')+'</span><span class="toggleOff">'+l('no')+'</span></div></div>';
	divs += '</fieldset>';
	divs += '<fieldset>';
	divs += '<div class="row"><label>'+l('channel')+'</label><input type="text" code="' + nvl(e.channel) + '" readonly="readonly" name="channel" value="' + nvl(channelNames[e.channel]) + '" onclick="showSelector(\'channel\', this);" /></div>';
	divs += '<div class="row"><label>'+l('tag')+'</label><input type="text" code="' + nvl(e.tag) + '" readonly="readonly" name="tag" value="' + nvl(window.channelTags[e.tag]) + '" onclick="showSelector(\'tag\',this);" /></div>';
	divs += '<div class="row"><label>'+l('genre')+'</label><input type="text" code="'+nvl(e.content_type)+'" readonly="readonly" name="contenttype" value="' + nvl(contentGroups[e.content_type]) + '" onclick="showSelector(\'genre\',this);" /></div>';
	divs += '<div class="row"><label>'+l('config')+'</label><input type="text" code="' + nvl(e.config_name) + '" readonly="readonly" name="config_name" value="' + nvl(configNames[e.config_name]) + '" onclick="showSelector(\'config\',this);" /></div>';
	divs += '</fieldset>';
	divs += '<fieldset>';
	for (var d=1; d<=7; d++) {
		divs += '<div class="row"><label>'+longdays[d]+'</label><div class="toggle" onclick="return;" name="enabled" toggled="'+(e.weekdays.join(',').indexOf(''+d)>=0) + '"><span class="thumb"></span><span class="toggleOn">'+days[d]+'</span><span class="toggleOff">'+days[d]+'</span></div></div>';
	}
	var starting = e.start;
	if (starting == 'Any') starting = l('any');
	divs += '<div class="row"><label>'+l('minDuration')+'</label><input type="text" code="'+(e.minduration)+'" readonly="readonly" name="minDuration" value="' + (e.minduration>0?getDuration(e.minduration)+l('hour.short'):l('any')) + '" onclick="showSelector(\'duration\',this);" /></div>';
	divs += '<div class="row"><label>'+l('maxDuration')+'</label><input type="text" code="'+(e.maxduration)+'" readonly="readonly" name="maxDuration" value="' + (e.maxduration>0?getDuration(e.maxduration)+l('hour.short'):l('any')) + '" onclick="showSelector(\'duration\',this);" /></div>';
	divs += '<div class="row"><label>'+l('startingAround')+'</label><input type="text" code="'+nvl(e.start)+'" readonly="readonly" name="startingAround" value="' + starting + '" onclick="showSelector(\'starting\',this);" /></div>';
	divs += '<div class="row"><label>'+l('priority')+'</label><input type="text" code="'+nvl(e.pri)+'" readonly="readonly" name="priority" value="' + (e.pri != undefined ? l('prio.'+priorities[e.pri]) : '') + '" onclick="showSelector(\'priority\',this);" /></div>';
	divs += '</fieldset>';
	divs += '<fieldset>';
	divs += '<div class="row"><label>'+l('createdBy')+'</label><input type="text" name="creator" value="' + nvl(e.creator) + '" /></div>';
	divs += '<div class="row"><label>'+l('comment')+'</label><input type="text" name="comment" value="' + nvl(e.comment) + '" /></div>';
	divs += '</fieldset>';
	divs += '<a class="whiteButton" href="javascript:saveAutomaticRecorder(\''+e.uuid+'\');">'+l('save')+'</a>';
	if (e.id != 'new') {
		divs += '<p>&nbsp;</p><a class="redButton" href="javascript:deleteAutomaticRecorder(\''+e.uuid+'\');">'+l('delete')+'</a>';
	}
	if (document.getElementById('ar_'+e.uuid) != null) {
		document.getElementById('ar_'+e.uuid).innerHTML = divs;
		return '';
	}
	else {
		return '<form id="ar_' + e.uuid + '" title="' + nvl(e.title) + '" class="panel">' + divs + '</form>';
	}
}

function getTimeFromMinutes(minutes) {
	var m = minutes % 60;
	var h = (minutes-m) / 60;
	var ht = (h < 10 ? '0' : '') + h;
	var mt = (m < 10 ? '0' : '') + m;
	return ht + ':' + mt;
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
		html += '<img alt="'+percent+'%" src="images/pb_trans.png" class="pb middle" height="10px" width="2px" />';
	html += '<img alt="'+percent+'%" src="images/pb_trans.png" class="pb right" height="10px" width="'+right+'px" />';
	return html;
}

function readSaveAutomaticRecorder(response) {
	loadAutomaticRecorderList();
	iui.goBack();
	document.getElementById('ar_new').outerHTML = getAutomaticRecorderForm(newAutomaticRecorder());
}

function readDeleteAutomaticRecorder(response) {
	loadAutomaticRecorderList();
	iui.goBack();
}

function deleteAutomaticRecorder(id) {
	if (confirm(l('reallyDeleteItem'))) {
		var entries = new Array();
		entries[0] = id;
		var params = "uuid="+JSON.stringify(entries);
		doPost("api/idnode/delete", readDeleteAutomaticRecorder, params);
	}
}

function saveAutomaticRecorder(id) {
	var form = document.getElementById('ar_'+id);
	var entries = new Array();
	entries[0] = new Object();
	if (id != 'new')
		entries[0].uuid = id;
	entries[0].title = form.titel.value;
	entries[0].enabled = form.getElementsByClassName('toggle')[0].getAttribute('toggled') == "true";
	entries[0].tag = form.tag.getAttribute('code');
	entries[0].channel = form.channel.getAttribute('code');
	entries[0].weekdays = new Array();
	for (var i=1; i<=7; i++) {
		if (form.getElementsByClassName('toggle')[i].getAttribute('toggled') == "true")
			entries[0].weekdays[i] = i; 
	}
	entries[0].content_type = form.contenttype.getAttribute('code');
	entries[0].config_name = form.config_name.getAttribute('code');
	entries[0].start = form.startingAround.getAttribute('code');
	entries[0].minduration = form.minDuration.getAttribute('code');
	entries[0].maxduration = form.maxDuration.getAttribute('code');
	entries[0].pri = form.priority.getAttribute('code');
	entries[0].creator = form.creator.value;
	entries[0].comment = form.comment.value;
	var params = (id=="new"?"conf="+JSON.stringify(entries[0]):"node="+JSON.stringify(entries));
	doPost((id=="new"?"api/dvr/autorec/create":"api/idnode/save"), readSaveAutomaticRecorder, params);
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
		window.contentGroups[e.key] = e.val;
		sel += '<li><a href="javascript:" code="'+e.key+'" onclick="selectItem(\'genre\',this);">'+(e.val?e.val:'&nbsp;')+'</a></li>';
	}
	document.getElementById('genreSelector').innerHTML = sel;
}

function readDiskspace(response) {
	if (response.messages != undefined && response.messages[0].totaldiskspace > 0) {
		var occup = 100 - (100*response.messages[0].freediskspace/response.messages[0].totaldiskspace);
		var val = response.messages[0].freediskspace;
                var unit = 'B';
                if (val > 1024) {
                        val /= 1024;
                        unit = 'KB';
                }
                if (val > 1024) {
                        val /= 1024;
                        unit = 'MB';
                }
                if (val > 1024) {
                        val /= 1024;
                        unit = 'GB';
                }
                if (val > 1024) {
                        val /= 1024;
                        unit = 'TB';
                }
                val = Math.round(val*10)/10;
		document.getElementById('diskspace').innerHTML = icon('../icons/drive.png','left')+getProgressBar(200, occup) + Math.round(occup) + '% <span class="small">('+val+' '+unit+')</span>';
	}
}

function readConfigs(response) {
	window.configs = response.entries;
	window.configNames = new Array();
	var sel='';
	for (i in response.entries) {
		var e = response.entries[i];
		sel += '<li><a href="javascript:" code="'+e.key+'" onclick="selectItem(\'config\',this);">'+e.val+'</a></li>';
		window.configNames[e.key] = e.val;
	}
	document.getElementById('configSelector').innerHTML = sel;
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

function readInputs(response) {
	var html = '';
	var app = '';
	for (var i in response.entries) {	
		var e = response.entries[i];
		html += '<li><a href="#input_'+e.uuid+'">'+e.input+'<div class="small">'+'</div>';
		if (e.signal != undefined)
			html += getProgressBar(200, e.signal) + e.signal + '%'; 
		html += '</a></li>';
		app += getInputForm(e);
	}
	document.getElementById('inputs').innerHTML = html;
	append(app);
}

function loadSubscriptions() {
	doGet('api/status/subscriptions', readSubscriptions);
}

function loadInputs() {
	doGet('api/status/inputs', readInputs);
}

function readChannelTags(response) {
	var html = new Array();
	html[0] = '<li><a href="#tag_0" onclick="showChannelInfos(\'0\');">'+l('allChannels')+'</a></li>';
	var ins = '';
	ins += '<ul id="tag_0" title="'+l('allChannels')+'"></ul>';
	var sel = new Array();
	sel[0] = '<li><a href="javascript:" code="" onclick="selectItem(\'tag\',this);">'+l('any')+'</a></li>';
	for (var i=0; i<response.entries.length; i++) {	
		var e = response.entries[i];
		window.channelTags[e.uuid] = e.name;
		html[e.uuid] = '<li><a href="#tag_'+e.uuid+'" onclick="showChannelInfos(\''+e.uuid+'\');">';
		html[e.uuid] += image(e.icon, undefined, undefined, window.blackLogo) + e.name+'</a></li>';
		ins += '<ul id="tag_'+e.uuid+'" title="'+e.name+'"></ul>';
		sel[e.uuid] = '<li><a href="javascript:" code="'+e.name+'" onclick="selectItem(\'tag\',this);">'+e.name+'</a></li>';
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
	window.channelTagsLoaded = true;
}

function getRecordingForm(e, type) {
	var divs = getIntro(e);
	divs += '<fieldset>';
	divs += textField('episode', e.episode, true);
	divs += textField('channel', e.channelname, true);
	divs += textField('priority', (e.pri != undefined ? l('prio.'+priorities[e.pri]) : ''), true);
	divs += textField('start', getDateTimeFromTimestamp(e.start, true), true);
	divs += textField('end', getDateTimeFromTimestamp(e.stop, true), true);
	divs += textField('duration', getDuration(e.stop-e.start)+l('hour.short'), true);
	divs += textField('config', configNames[e.config_name], true);
	var status = l('status.'+e.status)!='status.'+e.status ? l('status.'+e.status) : e.status;
	divs += textField('status', status, true);
	divs += '</fieldset>';
	if (e.sched_status == 'scheduled' || e.sched_status == 'recording' || type == 'failed')
		divs += '<a class="redButton" href="javascript:deleteEntry(\''+e.uuid+'\', \''+type+'\');">'+l('delete')+'</a>';
	if (document.getElementById('rec_'+e.uuid) != null) {
		document.getElementById('rec_'+e.uuid).innerHTML = divs;
		return '';
	}
	else {
		return '<form id="rec_' + e.uuid + '" title="' + (e.disp_title ? e.disp_title : e.title) + '" class="panel">' + divs + '</form>';
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

function getInputForm(e) {
	divs = '';
	divs += '<fieldset>';
	divs += textField('name', e.input, true);
	divs += textField('subs', e.subs, true);
	divs += textField('weight', e.weight, true);
	divs += textField('path', e.path, true);
	divs += textField('devicename', e.devicename, true);
	divs += textField('deliverysystem', e.deliverySystem, true);
	divs += textField('services', e.services, true);
	divs += textField('muxes', e.muxes, true);
	divs += textField('signal', e.signal, true);
	divs += '</fieldset>';
	if (document.getElementById('input_'+e.uuid) != null) {
		document.getElementById('input_'+e.uuid).innerHTML = divs;
		return '';
	}
	else {
		return '<form id="input_' + e.uuid + '" title="' + e.input + '" class="panel">' + divs + '</form>';
	}
}

function textField(labelKey, value, readonly) {
	return '<div class="row"><label>'+l(labelKey)+'</label><input type="text"'+(readonly?' readonly="readonly"':'')+' value="' + nvl(value) + '" /></div>';
}

function getIntro(e) {
	var divs = '';
	var ch = e.channelUuid ? e.channelUuid : e.channel;
	if (ch != undefined && channelIcons[ch] != undefined)
		divs += '<img class="'+(window.blackLogo ? ' black':'')+'" src="'+channelIcons[e.channelUuid ? e.channelUuid : e.channel]+'" width="80px" align="right" />';
	divs += '<h1>'+(e.disp_title ? e.disp_title : e.title)+'</h1>';
	if (e.disp_subtitle != undefined)
		divs += '<h2>'+e.disp_subtitle+'</h2>';
	else if (e.subtitle != undefined)
		divs += '<h2>'+e.subtitle+'</h2>';
	divs += '<p class="description">'+nvl(e.disp_description ? e.disp_description : e.description)+'</p><div style="clear:both;height:1px;"></div>';
	return divs;
}

function getEpgForm(e) {
	var divs = getIntro(e);
	divs += '<fieldset>';
	divs += textField('episode', e.episodeOnscreen, true);
	divs += textField('channel', e.channelName, true);
	divs += textField('start', getDateTimeFromTimestamp(e.start, true), true);
	divs += textField('end', getDateTimeFromTimestamp(e.stop, true), true);
	divs += textField('duration', getDuration(e.stop-e.start)+l('hour.short'), true);
	var genres = '';
	for (i in e.genre) {
		var dg = e.genre[i];
		var hg = dg - dg%16;
		var g = undefined;
		if (hg != dg && contentGroups[hg] != undefined)
			g = '[ '+contentGroups[hg]+' ]';
		if (contentGroups[dg] != undefined)
			g = ((g!=undefined)?g+' ':'') + contentGroups[dg];
		if (g != undefined && genres.indexOf(g)<0)
			genres += (genres!=''?', ':'')+g;
	}
	divs += textField('genre', genres, true);
	if (e.dvrState != "") {
		divs += textField('status', l('status.'+e.dvrState), true);
	}
	divs += '</fieldset>';
	if (e.dvrState == 'scheduled' || e.dvrState == 'running')
		divs += '<a class="redButton" href="javascript:cancelEpg('+e.start+',\''+e.dvrUuid+'\',\''+e.channelUuid+'\');">'+l('cancel')+'</a>';
	else {
		divs += '<a class="whiteButton" href="javascript:recordEpg('+e.eventId+',\''+e.channelUuid+'\');">'+l('record')+'</a>';
		divs += '<fieldset>';
		divs += '<div class="row"><label>'+l('config')+'</label><input type="text" readonly="readonly" code="" name="config" value="" onclick="javascript:showSelector(\'config\',this);" /></div>';
		divs += '</fieldset>';
	}
	if (document.getElementById('epg_'+e.eventId) != null) {
		document.getElementById('epg_'+e.eventId).innerHTML = divs;
		return '';
	}
	else {
		return '<form id="epg_' + e.eventId + '" title="' + e.title + '" class="panel" channel="'+e.channelUuid+'">' + divs + '</form>';
	}
}

function readRecordEpg(response) {
	loadRecordings('upcoming', true);
	reloadChannelIdEpg(response.param);
	if (epgLoaded['s'] > 0)
		searchEpg(false,false);
}

function showChannelInfos(tag) {
	var as = document.getElementById('tag_'+tag).getElementsByTagName('A');
	for (var i in as) {
		if (as[i].tagName != undefined && as[i].tagName.toLowerCase() == 'a') {
			var uuid = as[i].getAttribute('href').replace("#channel_", "");
			var imgs = as[i].getElementsByClassName('icon');
			if (imgs.length > 0 && channelIcons[uuid] != undefined && imgs[0].src != channelIcons[uuid]) {
				imgs[0].src = channelIcons[uuid];
			}
			var curr = as[i].getElementsByClassName('small');
			if (curr.length > 0) {
				var html = '';
				if (current[uuid] != undefined) {
					for (var i in current[uuid]) {
						var e = current[uuid][i];
						if (new Date() > new Date(e.start*1000) && new Date() <= new Date(e.stop*1000)) {
							html += layoutFormat(e, 'current');
							break;
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
			loadEpg(e.uuid, channel, true);
			break;
		}
	}
}

function reloadChannelIdEpg(channel) {
	for (var i in channels) {	
		var e = channels[i];
		if (e.uuid == channel) {
			loadEpg(channel, e.name, true);
			break;
		}
	}
}

function cancelEpg(start, dvrUuid, channel) {
	var entries = new Array();
	entries[0] = dvrUuid;
	var params = "uuid="+JSON.stringify(entries);
	doPostWithParam("api/idnode/delete", readRecordEpg, params, channel);
}

function recordEpg(id, channel) {
	var form = document.getElementById('epg_'+id);
	var params = 'event_id='+id+'&config_uuid='+form.config.getAttribute('code');
	doPostWithParam("api/dvr/entry/create_by_event", readRecordEpg, params, channel);
}

function readRecordings(response) {
	var which = response.param;
	var list = document.getElementById(which);
	var html = '';
	var divs = '';
	for (var i in response.entries) {	
		var e = response.entries[i];
		var day = getDateFromTimestamp(e.start, true);
		if (lastEpgDay[which] == undefined || lastEpgDay[which] != day) {
			html += '<li class="group">'+day+'</li>';
			lastEpgDay[which] = day;
		}
		html += '<li><a href="#rec_' + e.uuid + '">';
		if (e.dvrState == 'recording')
			html += icon('../icons/rec.png', '(recording)');
		if (e.dvrState == 'scheduled')
			html += icon('../icons/clock.png', '(scheduled)');
		html += layoutFormat(e, 'dvr');
		html += '</a></li>';
		divs += getRecordingForm(e, which);
	}
	if (response.totalCount > epgLoaded[which])
		html += '<li class="noBgImage"><a class="more" href="javascript:loadRecordings(\''+which+'\', false);">'+l('getMore')+'</a></li>';
	if (which == 'upcoming') {
		if (window.upcoming == undefined)
			window.upcoming = response;
		else {
			for (var i in response.entries)
				window.upcoming.entries[window.upcoming.entries.length] = response.entries[i];
		}
	}
	list.childNodes[list.childNodes.length-1].outerHTML = '';
	list.innerHTML += html;
	append(divs);
}

var lastRecordingType = undefined;

function loadRecordings(which, reload) {
	lastRecordingType = which;
	var start = epgLoaded[which] != undefined ? epgLoaded[which] : 0;
	var limit = 20;
	if (reload) {
		limit = start;
		start=0;
		if (limit == 0) limit = 20;
		if (start == 0)
			lastEpgDay[which] = undefined;
		var ch = document.getElementById(which);
		ch.innerHTML = '<li>'+l('loading')+'</li>';
		if (which == 'upcoming')
			upcoming = undefined;
	}
	var dir = (which == 'upcoming') ? 'ASC' : 'DESC';
	var params = 'sort=start_real&dir='+dir+'&start='+start+'&limit='+limit;
	epgLoaded[which] = start+limit;
	doPostWithParam("api/dvr/entry/grid_"+which, readRecordings, params, which);
}

function imageClass(url, id) {
	if (url)
		return '<img class="'+id+(window.blackLogo ? ' black':'')+'" src="'+url+'" align="top" width="35px" />';
	else
		return '';
}

function readChannels(response) {
	if (!window.channelTagsLoaded) {
		window.setTimeout(function() { readChannels(response); }, 200);
		return;
	}
	window.channels = response.entries;
	var sel = new Array();
	sel[0] = '<li><a href="javascript:" code="" onclick="selectItem(\'channel\',this);">'+l('any')+'</a></li>';
	var app = '';
	var tagHtml = new Array();
	for (var i in response.entries) {
		var e = response.entries[i];
		var no = e.number != undefined ? '<span class="chno round">'+e.number+'</span>' : '';
		window.channelNames[e.uuid] = e.name;
		window.channelIcons[e.uuid] = getIcon(e);
		html = '<li><a href="#channel_' + e.uuid + '" onclick="loadEpg(\''+e.uuid+'\', \''+e.name+'\', true);">';
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
		app += '<ul id="channel_'+e.uuid+'" title="'+e.name+'"><li>'+l('loading')+'</li></ul>';
		app += '<form class="panel" id="live_'+e.uuid+'" title="'+e.name+'">';
		var streamUrl = window.location.protocol+'//'+window.location.host+'/play/stream/channel/'+e.uuid;
		app += '<h1>'+l('liveTv')+'</h1><p>'+streamUrl+'</p>';
		app += '<a target="_blank" href="'+streamUrl+'" class="whiteButton">'+streamUrl+'</a>';
		app += '<a target="_blank" href="buzzplayer://'+streamUrl+'" class="whiteButton">Buzzplayer</a>';
		app += '</form>';
		sel[sortNo] += '<li><a href="javascript:" code="'+e.uuid+'" onclick="selectItem(\'channel\',this);">'+e.name+'</a></li>';
	}
	for (var i in tagHtml) {
		var tagch = '<li><a href="epg.html?'+i+'" target="epg">'+icon('images/timeline.png')+l('timeline')+'</a></li><li><a href="mag.html?'+i+'" target="mag">'+icon('images/book_open.png')+l('magazine')+'</a></li><li class="group">'+l('channels')+'</li>';
		for (var j in tagHtml[i])
			tagch += tagHtml[i][j];
		document.getElementById('tag_'+i).innerHTML = tagch;
	}
	var sels = '';
	for (var i in sel)
		sels += sel[i];
	append(app);
	document.getElementById('channelSelector').innerHTML = sels;
	window.channelsLoaded = true;
}

function readCancelEntry(response) {
	if (response.success == 1) {
		if (response.param != undefined)
			loadRecordings(response.param, true);
		if (epgLoaded['s'] > 0)
			searchEpg(false,false);
		iui.goBack();
	}
	else {
		alert(l('errorCancellingEntry'));
	}
}

function readDeleteEntry(response) {
//	if (response.success == 1) {
		if (response.param != undefined)
			loadRecordings(response.param, true);
		if (epgLoaded['s'] > 0)
			searchEpg(false,false);
		iui.goBack();
//	}
//	else {
//		alert(l('errorDeletingEntry'));
//	}
}

function cancelEntry(entryId, type) {
	doPostWithParam('dvr', readCancelEntry, 'entryId='+entryId+'&op=cancelEntry', type);
}

function deleteEntry(entryId, type) {
	var entries = new Array();
	entries[0] = entryId;
	var params = "uuid="+JSON.stringify(entries);
	if (confirm(l('reallyDeleteItem')))
		doPostWithParam('api/idnode/delete', readDeleteEntry, params, type);
}

var lastSearch = '';
function readEpg(response) {
	var html = '';
	var ins = '';
	var uuid = response.param;
	if (endTimes[uuid] == undefined)
		endTimes[uuid] = new Array();
	if (response.entries.length > 0) {
		for (var i in response.entries) {
			var e = response.entries[i];
			if (endTimes[uuid][e.stop] == undefined)
				endTimes[uuid][e.stop] = 1;
			else
				endTimes[uuid][e.stop]++;
			var day = getDateFromTimestamp(e.start, true);
			if (lastEpgDay[uuid] == undefined || lastEpgDay[uuid] != day) {
				html += '<li class="group">'+day+'</li>';
				lastEpgDay[uuid] = day;
			}
			var epg = '';
			if (e.dvrState == 'scheduled')
				epg += icon('../icons/clock.png', '(scheduled)');
			else if (e.dvrState == 'recording')
				epg += icon('../icons/rec.png', '(recording)');
			else if (e.dvrState == 'completed')
				epg += icon('../icons/television.png', '(completed)');
			else if (e.dvrState == 'recordingError' || e.dvrState == 'completedError')
				epg += icon('../icons/exclamation.png', '(error)');
			epg += layoutFormat(e, uuid == 's' ? 'search' : 'epg');
			html += '<li><a href="#epg_'+e.eventId+'">' + epg + '</a></li>';
			ins += getEpgForm(e);
		}
		if (response.totalCount > epgLoaded[uuid])
			html += '<li class="noBgImage"><a class="more" href="javascript:loadEpg(\''+uuid+'\', \''+response.entries[0].channel+'\', false);">'+l('getMore')+'</a></li>';
		var ch = document.getElementById('channel_'+uuid);
		if (uuid == 's')
			ch = document.getElementById('search');
		else if (ch.childNodes.length == 1) {
			html = '<li class="noBgImage"><a href="#live_'+uuid+'" class="live">'+icon('../icons/control_play.png')+l('liveTv')+'</a></li>' + html;
		}
		ch.childNodes[ch.childNodes.length-1].outerHTML = '';
		ch.innerHTML += html;
		append(ins);
	}
	else {
		var ch = document.getElementById('channel_'+uuid);
		if (uuid == 's')
			ch = document.getElementById('search');
		ch.childNodes[ch.childNodes.length-1].outerHTML = '';
	}
}

var epgLoaded = new Array();
var lastEpgDay = new Array();
function loadEpg(uuid, chname, reload) {
	var start = epgLoaded[uuid] != undefined ? epgLoaded[uuid] : 0;
	var limit = 20;
	if (reload) {
		limit = start;
		start=0;
		if (limit == 0) limit = 20;
		var ch = document.getElementById('channel_'+uuid);
		ch.innerHTML = '<li>'+l('loading')+'</li>';
		lastEpgDay[uuid] = undefined;
	}
	if (endTimes[uuid] == undefined)
		endTimes[uuid] = new Array();
	for (var i in endTimes[uuid]) {
		if (i < new Date()/1000)
			start -= endTimes[uuid][i];
	}
	endTimes[uuid] = new Array();
	if (start < 0)
		start = 0;
	var params = 'start='+start+'&limit='+limit+'&channel='+uuid;
	if (uuid == 's')
		params = 'start='+start+'&limit='+limit+'&title='+encodeURIComponent(lastSearch);
	epgLoaded[uuid] = start+limit;
	doPostWithParam("api/epg/events/grid", readEpg, params, uuid);
}

function readCurrent(response) {
	for (var i in response.entries) {
		var e = response.entries[i];
		if (current[e.channelUuid] == undefined)
			current[e.channelUuid] = new Array();
		current[e.channelUuid][e.start] = e;
	}
	if (location.hash != undefined && location.hash.indexOf('#_tag_') == 0) {
		var tag = location.hash.replace("#_tag_", "");
		showChannelInfos(tag);
	}
}

var current = new Array();

function loadCurrent() {
	if (!window.channelsLoaded) {
		window.setTimeout(function() { loadCurrent(); }, 200);
		return;
	}
	doPost("api/epg/events/grid", readCurrent, "start=0&limit="+(channels.length*2));
}

function newAutomaticRecorder() {
	var add = new Object();
	add.uuid = 'new';
	add.title = '';
	add.creator = '';
	add.comment = '';
	add.weekdays = new Array(1,2,3,4,5,6,7);
	add.enabled = true;
	add.prio = '5';
	add.start  = '';
	return add;
}

function readAutomaticRecorderList(response) {
	var list = document.getElementById('ar');
	var html = '';
	var divs = '';
	html += '<li><a href="#ar_new">'+icon('../icons/add.png','')+l('newEntry')+'</a></li>';
	divs += getAutomaticRecorderForm(newAutomaticRecorder());
	for (var i in response.entries) {	
		var e = response.entries[i];
		var info = '';
		info += plusMinus(e.pri);
		info += e.channel ? (info.length > 0 ? ' ' : '') + window.channelNames[e.channel] : '';
		info += e.tag ? (info.length > 0 ? ' &mdash; ' : '') + window.channelTags[e.tag] : '';
		info += e.content_type ? (info.length > 0 ? ' &mdash; ' : '') + window.contentGroups[e.content_type] : '';
		info += e.config_name ? (info.length > 0 ? ' &mdash; ' : '') + configNames[e.config_name] : '';
		info += e.start != '' && e.start != 'Any' ? (info.length > 0 ? ' &mdash; ' : '') + e.start : '';
		info += e.minduration != '' ? (info.length > 0 ? ' &mdash; ' : '') + "&ge;"+getDuration(e.minduration)+l('hour.short') : '';
		info += e.maxduration != '' ? (info.length > 0 ? ' &mdash; ' : '') + "&le;"+getDuration(e.maxduration)+l('hour.short') : '';
		if (e.weekdays != undefined && e.weekdays.length < 7) {
			var wds = e.weekdays.join(',');
			for (var d=1; d<=7; d++) {
				wds = wds.replace(d, days[d]);
			}
			info += (info.length > 0 ? ' &mdash; ' : '') + wds;
		}
		html += '<li><a' + (e.enabled?'':' class="inactive"')+' href="#ar_' + e.uuid + '">';
		html += e.enabled ? icon('../icons/tick.png',l('active')):icon('../icons/control_pause.png', l('inactive'));
		html += e.title;
		if (info.length > 0)
			html += '<div class="small padleft">'+info+'</div>';
		html += '</a></li>';
		divs += getAutomaticRecorderForm(e);
	}
	list.innerHTML = html;
	append(divs);
}

function searchEpg(show, wait, reload) {
	var tosearch = document.getElementById('searchText').value;
	lastSearch = tosearch;
	var start = 0;
	lastEpgDay['s'] = '';
	endTimes['s'] = new Array();
	var limit = 20;
	if (reload) {
		limit = epgLoaded['s'];
		if (limit == 0 || limit == undefined) limit = 20;
	}
	var ch = document.getElementById('search');
	ch.innerHTML = '<li>'+l('loading')+'</li>';
	var params = 'start='+start+'&limit='+limit+'&title='+tosearch;
	epgLoaded['s'] = start+limit;
	doPostWithParam("api/epg/events/grid", readEpg, params, 's');
	if (show) {
		if (wait)
			setTimeout(function() {iui.showPageById('search');}, 1000);
		else
			iui.showPageById('search');
	}
}

function loadAutomaticRecorderList() {
	doGet("api/dvr/autorec/grid", readAutomaticRecorderList, "dir=ASC&sort=name");
}

function initialLoad() {
	doPost("api/epg/content_type/list", readContentGroups, "full=1");
	doPost("api/idnode/load", readConfigs, "enum=1&class=dvrconfig");
	doPost("comet/poll", readDiskspace, "boxid=&immediate=0");
	channelTagsLoaded = false;
	channelsLoaded = false;
	doPost("api/channeltag/grid", readChannelTags, "sort=index&dir=ASC&all=1");
	doPost("api/channel/grid", readChannels, "start=0&limit=999999999&sort=number&dir=ASC&all=1");
	loadCurrent();
	loadRecordings('upcoming', true);
}

function reload(initial) {
	if (initial || location.hash == '#_home' || location.hash == '' || location.hash == undefined)
		initialLoad();
	if (location.hash != undefined) {
		if (location.hash.indexOf('#_tag') == 0) {
			initialLoad();
			if (initial)
				showInitialPage('tags');
		}
		if (location.hash.indexOf('#_ar') == 0) {
			loadAutomaticRecorderList();
			if (initial)
				showInitialPage('ar');
		}
		if (location.hash.indexOf('#_channel_') == 0) {
			var uuid = location.hash.replace('#_channel_', '');
			reloadChannelIdEpg(uuid);
		}
		if (location.hash.indexOf('#_epg_') == 0) {
			var panel = document.getElementById(location.hash.replace('#_', ''));
			if (panel != null) {
				var channel = panel.getAttribute('channel');
				reloadChannelEpg(channel);
			}
		}
		if (location.hash.indexOf('#_upcoming') == 0) {
			if (initial) 
				showInitialPage('upcoming');
			else
				loadRecordings('upcoming', true);
		}
		if (location.hash.indexOf('#_finished') == 0) {
			loadRecordings('finished', true);
			if (initial)
				showInitialPage('finished');
		}
		if (location.hash.indexOf('#_failed') == 0) {
			loadRecordings('failed', true);
			if (initial)
				showInitialPage('failed');
		}
		if (location.hash.indexOf('#_rec_') == 0 && lastRecordingType != undefined)
			loadRecordings(lastRecordingType, true);
		if (location.hash.indexOf('#_about') == 0) {
			loadAbout();
			if (initial)
				showInitialPage('about');
		}
		if (location.hash.indexOf('#_subscription') == 0) {
			loadSubscriptions();
			if (initial)
				showInitialPage('subscription');
		}
		if (location.hash.indexOf('#_input') == 0) {
			loadInput();
			if (initial)
				showInitialPage('input');
		}
		if (location.hash.indexOf('#_search') == 0)
			if (!initial)
				searchEpg(false,false,true);
	}
}

function showInitialPage(page) {
	iui.showPageById('home');
	iui.showPageById(page);
}

function showClearSearch(visible) {
	if (visible)
		document.getElementById('clearSearch').style.display = '';
	else
		setTimeout(function() {document.getElementById('clearSearch').style.display = 'none';}, 200);
}

function init() {
	self.name = 'tvheadend';
	document.getElementById('reloadButton').innerHTML = l('reload');
	var ini = '';
	ini += '<li id="diskspaceHeader" class="group">'+l('diskspace')+'</li>';
	ini += '<li style="text-align:center;" class="noBgImage" id="diskspace">'+icon('../icons/drive.png','left')+'&mdash;'+'</li>';
	ini += '<li id="epgGroup" class="group">'+l('electronicProgramGuide')+'</li>';
	ini += '<li class="noBgImage"><form onsubmit="searchEpg(true,true);return false;"><div style="position:relative;"><input id="searchText" class="round" type="text" name="search" onfocus="showClearSearch(true);" onkeydown="showClearSearch(true);" onblur="showClearSearch(false);" /><img id="clearSearch" src="images/clearsearch.png" style="display:none;position:absolute;top:2px;right:1.2%;cursor:pointer;" onclick="document.getElementById(\'searchText\').value=\'\';document.getElementById(\'searchText\').focus();"></div>';
	ini += '<div><input id="searchButton" type="button" value="'+l('search')+'" style="width:99%;" onclick="searchEpg(true,false);"/></div></form></li>';
	ini += '<li><a href="#tags">'+icon('../icons/channel_tags.png')+l('tags')+'</a></li>';
	ini += '<li><a href="epg.html" target="epg">'+icon('images/timeline.png')+l('timeline')+'</a></li>';
	ini += '<li><a href="mag.html" target="mag">'+icon('images/book_open.png')+l('magazine')+'</a></li>';
	ini += '<li class="group">'+l('digitalVideoRecorder')+'</li>';
	ini += '<li><a href="#upcoming" onclick="loadRecordings(\'upcoming\', true);">'+icon('../icons/upcoming_rec.png','')+l('upcomingRecordings')+'</a></li>';
	ini += '<li><a href="#finished" onclick="loadRecordings(\'finished\', true);">'+icon('../icons/accept.png','')+l('finishedRecordings')+'</a></li>';
	ini += '<li><a href="#failed" onclick="loadRecordings(\'failed\', true);">'+icon('../icons/exclamation.png','')+l('failedRecordings')+'</a></li>';
	ini += '<li><a href="#ar" onclick="loadAutomaticRecorderList();">'+icon('../icons/auto_rec.png','')+l('automaticRecorder')+'</a></li>';
	ini += '<li class="group">'+l('informationStatus')+'</li>';
	ini += '<li><a href="#subscriptions" onclick="loadSubscriptions();">'+icon('../icons/subscriptions.png')+l('subscriptions')+'</a></li>';
	ini += '<li><a href="#inputs" onclick="loadInputs();">'+icon('../icons/stream.png')+l('inputs')+'</a></li>';
	ini += '<li><a href="#about" onclick="loadAbout();">'+icon('../icons/information.png')+l('about')+'</a></li>';
	ini += '<li><a href="../../extjs.html" target="_blank">'+icon('../img/logo.png')+l('desktopSite')+'</a></li>';

	document.getElementById('home').innerHTML += ini;
	var app = '';
	app += '<ul id="tags" title="'+l('tags')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="ar" title="'+l('automaticRecorder')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="upcoming" title="'+l('upcomingRecordings')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="finished" title="'+l('finishedRecordings')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="failed" title="'+l('failedRecordings')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="subscriptions" title="'+l('subscriptions')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="inputs" title="'+l('inputs')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="about" title="'+l('about')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="search" title="'+l('search')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="tagSelector" class="selector" title="'+l('tag')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="genreSelector" class="selector" title="'+l('genre')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="prioritySelector" class="selector" title="'+l('priority')+'">';
	for (i in priorities) {
		app += '<li><a href="javascript:" code="'+i+'" onclick="selectItem(\'priority\',this);">'+l('prio.'+priorities[i])+'</li>';
	}
	app += '</ul>';
	app += '<ul id="durationSelector" class="selector" title="'+l('duration')+'">';
	app += '<li><a href="javascript:" code="0" onclick="selectItem(\'duration\',this);">'+l('any')+'</li>';
	for (var m=60; m<120*60; m+=60) {
		app += '<li><a href="javascript:" code="'+m+'" onclick="selectItem(\'duration\',this);">'+getDuration(m)+l('hour.short')+'</li>';
	}
	for (var m=120*60; m<=24*60*60; m+=30*60) {
		app += '<li><a href="javascript:" code="'+m+'" onclick="selectItem(\'duration\',this);">'+getDuration(m)+l('hour.short')+'</li>';
	}
	app += '</ul>';
	app += '<ul id="startingSelector" class="selector" title="'+l('startingAround')+'">';
	app += '<li><a code="Any" href="javascript:" onclick="selectItem(\'starting\',this);">'+l('any')+'</a></li>';
	for (var h=0; h<24; h++) {
		for (var m=0; m<60; m+=10) {
			var ms = h*60 + m;
			var ht = (h < 10 ? '0' : '') + h;
			var mt = (m < 10 ? '0' : '') + m;
			var t = ht + ':' + mt;
			app += '<li><a code="'+t+'" href="javascript:" onclick="selectItem(\'starting\',this);">'+t+'</a></li>';
		}
	}
	app += '</ul>';
	app += '<ul id="configSelector" class="selector" title="'+l('config')+'"><li>'+l('loading')+'</li></ul>';
	app += '<ul id="channelSelector" class="selector" title="'+l('channel')+'"><li>'+l('loading')+'</li></ul>';
	append(app);
	reload(true);
}
