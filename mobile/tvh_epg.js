var maxHeight = 0;
var lh=50;
var channelToY = new Array();
var chLimit = new Array();
var last = '';
var lastChannel = '';
var lastEpgX;
var limit = 400;
var start = 0;
var gap = 4;
var contentGroups = new Array();
var selectedTag = 0;
var channelTags = new Array();
var nullTime = new Date().getTime()/1000;
var endTimes = new Array();
var scaleDown = 10;
var leftPadding = 150;
var configs;
var configSelect;
var tagSelect;
var cancelRecordingId;
var cancelRecordingStart;
var cancelRecordingChannel;
var loadedPosters = new Array();
var loadedBackdrops = new Array();
var posterWidth = 92;
var backdropWidth = 780;
var tmdbImgUrl = 'http://d3gtl9l2a4fn1j.cloudfront.net/t/p/w';

function loadEpg() {
	doPost("api/epg/events/grid", readEpg, 'start='+start+'&limit='+limit+'&channelTag='+selectedTag);
}

function scrollHandler(event) {
	var nVScroll = document.documentElement.scrollTop || document.body.scrollTop;
	var nHScroll = document.documentElement.scrollLeft || document.body.scrollLeft;
	document.getElementById('logos').style.left = nHScroll+'px';
	document.getElementById('timeline').style.top = nVScroll+'px';
	if (lastEpgX != undefined && nHScroll + window.innerWidth + 100 > lastEpgX)
		loadMoreEpg();
}

window.onscroll = scrollHandler;

function showChannel(id) {
	if (document.getElementById('e_'+last) != null) {
		document.getElementById('e_'+last).className = document.getElementById('e_'+last).className.replace('big', '');
	}
	if (document.getElementById('c_'+lastChannel) != null) {
		document.getElementById('c_'+lastChannel).style.display = 'none';
		document.getElementById('i_'+lastChannel).style.zIndex = '6';
	}
	if (lastChannel != id) {
		lastChannel = id;
		var div = document.getElementById('c_'+id);
		div.style.display = 'block';
		document.getElementById('i_'+lastChannel).style.zIndex = '8';
		ensureVisible(div, false);
	}
	else {
		lastChannel = '';
	}
}

function ensureVisible(div, horiz) {
	var scroll = /Safari/.test(navigator.userAgent) ? document.body : document.documentElement;
	if (horiz && div.offsetLeft+div.offsetWidth > scroll.scrollLeft + window.innerWidth) {
		scroll.scrollLeft = div.offsetLeft+div.offsetWidth - window.innerWidth+10;
	}  
	if (div.offsetTop+div.offsetHeight > scroll.scrollTop + window.innerHeight) {
		scroll.scrollTop = div.offsetTop+div.offsetHeight - window.innerHeight+10;
	} 
	if (div.offsetTop < scroll.scrollTop) {
		scroll.scrollTop = div.offsetTop;
	}
	if (horiz && div.offsetLeft < scroll.scrollLeft) {
		scroll.scrollLeft = div.offsetLeft;
	}
	if (horiz && div.offsetLeft+div.offsetWidth > scroll.scrollLeft + window.innerWidth) {
		scroll.scrollLeft = div.offsetLeft+div.offsetWidth - window.innerWidth+10;
	}  
}

function show(id) {
	if (document.getElementById('c_'+lastChannel) != null) {
		document.getElementById('c_'+lastChannel).style.display = 'none';
		document.getElementById('i_'+lastChannel).style.zIndex = '6';
	}
	if (document.getElementById('e_'+last) != null) {
		document.getElementById('e_'+last).className = document.getElementById('e_'+last).className.replace('big', '');
	}
	if (last != id) {
		last = id;
		var div = document.getElementById('e_'+id);
		div.className += ' big';
		var poster = div.getElementsByClassName('poster');
		if (poster.length > 0 && poster[0].innerHTML == '' && tmdbApiKey != '') {
			var title = div.getElementsByTagName('h1')[0].innerHTML;
			var p = '-';
			if (loadedPosters[title] != undefined) {
				p = loadedPosters[title];
				poster[0].innerHTML = (p!='-') ? '<img width="'+posterWidth+'px" src="'+tmdbImgUrl+posterWidth+p+'" />' : '&nbsp;';
				if (loadedBackdrops[title] != undefined && loadedBackdrops[title] != '-') {
					div.style.backgroundImage = 'url('+tmdbImgUrl+backdropWidth+loadedBackdrops[title]+')';
					div.className += ' backdrop';
				}
				var att = div.getElementsByClassName('tmdb');
				if (att.length > 0) {
					att[0].style.display = 'block';
				}
			}
			else {
				var http = new XMLHttpRequest();
				http.open("GET", 'http://api.themoviedb.org/3/search/movie?api_key='+tmdbApiKey+'&query='+encodeURI(title)+'&language='+navigator.language.substring(0,2));
				http.send(null);
				http.title = title;
				http.div = div;
				http.poster = poster;
				http.pw = posterWidth;

				http.onreadystatechange = function() {
					if(http.readyState == 4 && http.status == 200) {
						var response = JSON.parse("[" + http.responseText + "]");
						var p = '-';
						var bd = '-';
						for (var i=0; i<response[0].results.length; i++) {
							if (response[0].results[i].title == http.title) {
								p = response[0].results[i].poster_path;
								if (response[0].results[i].backdrop_path != '' && response[0].results[i].backdrop_path != null)
									bd = response[0].results[i].backdrop_path;
								break;
							}
						}
						loadedPosters[http.title] = p;
						loadedBackdrops[http.title] = bd;
						http.poster[0].innerHTML = (p!='-') ? '<img width="'+http.pw+'px" src="'+tmdbImgUrl+http.pw+p+'" />' : '&nbsp;';
						if (bd != '-') {
							http.div.style.backgroundImage = 'url('+tmdbImgUrl+backdropWidth+bd+')';
							http.div.className += ' backdrop';
						}
						if (p!='-') {
							var att = http.div.getElementsByClassName('tmdb');
							if (att.length > 0) {
								att[0].style.display = 'block';
							}
						}
					}
				};
			}
		}
		ensureVisible(div, true);
	}
	else {
		last = '';
	}
}

function timestampToX(timestamp) {
	return leftPadding + (timestamp - nullTime)/scaleDown;
}

function readEpg(response) {
	if (response.entries.length > 0) {
		var html = '';
		var last = lastEpgX == undefined ? 0 : lastEpgX;
		for (var i in response.entries) {
			var e = response.entries[i];
			var open = '';
			if (document.getElementById('e_'+e.eventId) != null) {
				open = document.getElementById('e_'+e.eventId).className.indexOf('big') > 0 ? ' big':'';
				document.getElementById('e_'+e.eventId).outerHTML = '';
			}
			if (endTimes[e.stop] == undefined)
				endTimes[e.stop] = 1;
			else
				endTimes[e.stop]++;
			var w = ((e.stop-e.start)/scaleDown);
			var x = timestampToX(e.start);
			var y = channelToY[e.channelUuid];
			if (x<0) {
				w+=x;
				x=0;
			}
			last = x > last ? x : last;
			if (e.content_type == undefined) e.content_type = 0;
			e.content_type -= e.content_type % 16;
			html += '<div id="e_'+e.eventId+'" class="box '+e.dvrState+' ct_'+e.content_type+open+'" style="top:'+y+'px;left:'+x+'px;width:'+w+'px;height:'+lh+'px;">';
			html += '<div class="bgimage"><div class="gradient"><div class="head" onclick="show('+e.eventId+');"><h1>'+e.title+'</h1>';
			var sub = '';
			if (e.subtitle != undefined && e.subtitle != e.title)
				sub += e.subtitle;
			if (e.episodeOnscreen != undefined)
				sub += (sub.length > 0 ? ' &mdash; ' : '') + e.episodeOnscreen;
			html += '<h2>'+sub+'</h2></div>';
			html += '<div class="add">'+(e.content_type==0||e.content_type==16?'<div class="poster"></div>':'')+'<h3 onclick="show('+e.id+');">'+nvl(contentGroups[e.contenttype])+'</h3><p class="desc" onclick="show('+e.eventId+');">'+nvl(e.description)+'</p>';
			html += '<p class="time">' + getDateTimeFromTimestamp(e.start, true) + '&ndash;' + getTimeFromTimestamp(e.stop) + ' (' + getDuration(e.stop-e.start) + l('hour.short') + ')</p>';
			html += '<p class="channel">' + e.channelName + ' &mdash; <a href="http://akas.imdb.org/find?q='+e.title+'" target="_blank">'+l('imdbSearch')+'</a> &mdash; <a href="http://www.themoviedb.org/search?query='+e.title+'" target="_blank">'+l('tmdbSearch')+'</a></p><br clear="all" />';
			html += '<form class="record">'+configSelect+'<br /><input type="button" value="'+l('record')+'" onclick="record('+e.eventId+',this,\''+e.channelName+'\');" /></form>';
			html += '<form class="cancel"><input type="button" value="'+l('cancel')+'" onclick="cancel('+e.eventId+', \''+e.dvrUuid+'\', \''+e.channelName+'\');" /></form>';
			html += '<p class="tmdb">'+l('tmdbAttribution')+'</p>';
			html += '</div>';
			html += '</div>';
			html += '</div>';
			html += '</div>';
			if (window.chLimit[e.channelName] == undefined)
				window.chLimit[e.channelName] = 1;
			else
				window.chLimit[e.channelName]++;
		}
		append(html);
		lastEpgX = last;
		scrollHandler();
	}
}

function cancel(id, dvrUuid, channel) {
	cancelRecordingId = id;
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
	var params = 'start=0&limit='+window.chLimit[response.param]+'&channel='+encodeURIComponent(response.param);
	window.chLimit[response.param] = 0;
	doPost("api/epg/events/grid", readEpg, params);
}

function readConfigs(response) {
	window.configs = response.entries;
	window.configSelect = '<select name="config">';
	for (i in response.entries) {
		var e = response.entries[i];
		var selected = (e.key == '') ? ' selected="selected"' : '';
		window.configSelect += '<option value="'+e.key+'"'+selected+'>'+e.val+'</option>';
	}
	window.configSelect += '</select>';
	doPost("api/channeltag/grid", readChannelTags, "sort=name&dir=ASC&all=1");
}

function showTag(tag) {
	window.location.search = '?'+tag;
}

function readChannelTags(response) {
	var sel = new Array();
	sel[0] = '<option value="0">'+l('allChannels')+'</option>';
	for (var i=0; i<response.entries.length; i++) {	
		var e = response.entries[i];
		var selected= '';
		var tag = window.location.search.replace('?','');
		if (tag == e.uuid) {
			selectedTag = e.uuid;
			selected = ' selected="selected"';
		}
		window.channelTags[e.uuid] = e.name;
		sel[e.uuid] = '<option value="'+e.uuid+'"'+selected+'>'+e.name+'</option>';
	}
	tagSelect = '<select onchange="showTag(this.value);">';
	for (var i in sel)
		tagSelect += sel[i];
	tagSelect += '</select>';
	doPost("api/channel/grid", readChannels, "start=0&limit=999999999&sort=number&dir=ASC&all=1");
}

function loadMoreEpg() {
	lastEpgX = undefined;
	start += limit;
	for (var i in endTimes) {
		if (i < new Date()/1000)
			start -= endTimes[i];
	}
	endTimes = new Array();
	if (start < 0)
		start = 0;
	loadEpg();
}

function initTimeline() {
	var start = new Date();
	var html = '';
	var i=0;
	start.setTime(start.getTime()-60*60*1000);
	start.setMinutes(0);
	start.setSeconds(0);
	while (i++<180) {
		html += '<div style="left:'+(timestampToX(start.getTime()/1000)-1)+'px;width:'+(30*60/scaleDown)+'px;">';
		if (start.getHours() == 0 && start.getMinutes() == 0)
			html += getDate(start, true) + ' ';
		html += getTime(start)+'</div>';
		start.setTime(start.getTime()+30*60*1000);
	}
	append('<div id="timeline">'+html+'</div><div id="current"></div>');
}

function setCurrent() {
	var c = document.getElementById('current');
	if (c != null) {
		c.style.left = timestampToX((new Date().getTime())/1000) + 'px';
		c.style.height = maxHeight + 'px';
	}
	setTimeout(setCurrent, 30*1000);
}

function readChannels(response) {
	initTimeline();
	window.channels = response.entries;
	var y=20;
	var html = '';
	var channels = new Array();
	for (var i in response.entries) {
		var e = response.entries[i];
		var tags = ',0,'+e.tags+',';
		if (tags.indexOf(','+selectedTag+',') >= 0) {
			var sortNo = e.number!=undefined?e.number:9999;
			if (channels[sortNo] == undefined) channels[sortNo] = new Array();
			channels[sortNo][channels[sortNo].length] = e;
		}
	}
	for (var i in channels) {
		for (var j in channels[i]) {
			var e = channels[i][j];
			var streamUrl = window.location.protocol+'//'+window.location.host+'/play/stream/channel/'+e.uuid;
			html += '<div id="c_'+e.uuid+'" style="left:-5px;top:'+(y-1)+'px;" class="channelinfo">';
			html += '<div class="right"><h1>'+e.name+'</h1><h2>'+icon('../icons/control_play.png') + l('liveTv')+'</h2><p>'+streamUrl+'</p>';
			html += '<p><a target="_blank" href="'+streamUrl+'"><button>HTTP</button></a>';
			html += '<a target="_blank" href="buzzplayer://'+streamUrl+'"><button>Buzzplayer</button></a></p>';
			html += '<hr><h2>'+icon('../icons/channel_tags.png') + l('tags') + '</h2><p>' + tagSelect + '</p>';
			html += '</div>';
			html += (e.number != undefined ? '<div class="left"><span class="chno round">'+e.number+'</span></div>' : '');
			html += '<a class="back" target="tvheadend" href="mobile.html"><img class="back" src="images/tvheadend128.png" title="'+l('backToMobileUi')+'" width="50px" /></a>';
			html += '</div>';
			if (getIcon(e) != undefined && getIcon(e) != "") 
				html += '<img id="i_'+e.uuid+'" height="'+lh+'px" onclick="showChannel(\''+e.uuid+'\');" class="channel'+(window.blackLogo?' black':'')+'" src="'+getIcon(e)+'" alt="'+e.name+'" title="'+e.name+'" style="left:0px;top:'+y+'px;" />';
			else
				html += '<div id="i_'+e.uuid+'" onclick="showChannel(\''+e.uuid+'\');" class="channel" title="'+e.name+'" style="left:0px;top:'+y+'px;height:'+lh+'px;" />'+e.name+'</div>';
			channelToY[e.uuid] = y;
			y+=lh+gap;
			maxHeight = y;
		}
	}
	loadEpg();
	append('<div id="logos" class="'+(window.blackLogo?'black':'')+'"style="height:'+y+'px;">'+html+'</div>');
	setCurrent();
}

function readContentGroups(response) {
	for (var i=0; i<response.entries.length; i++) {	
		var e = response.entries[i];
		window.contentGroups[e.key] = e.val;
	}
	doPost("api/idnode/load", readConfigs, "enum=1&class=dvrconfig");
}

function init() {
	self.name = 'epg';
	doPost("api/epg/content_type/list", readContentGroups, "full=0");
}
