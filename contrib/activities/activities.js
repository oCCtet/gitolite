// gl-activities javascript (C) 2013 Sami Hartikainen <sami.a.hartikainen@gmail.com>
// uses the jQuery javascript library

// Get the activities JSON document from the server and render
// it to the element with id 'gl-activities-listing', refreshing
// the web part periodically.

var aMinute    = 60000;      // 1000 * 60
var twoMinutes = 120000;     // aMinute * 2
var anHour     = 3600000;    // aMinute * 60
var twoHours   = 7200000;    // anHour * 2
var aDay       = 86400000;   // anHour * 24
var twoDays    = 172800000;  // aDay * 2
var aWeek      = 604800000;  // aDay * 7
var twoWeeks   = 1209600000; // aWeek * 2

var url = "/cgi-bin/activities.cgi";

// The CGI program may override the min/max/interval
// values when requested for the options, so these
// are only initial/fallback values.

var nMin       = 7;
var nMax       = 100;
var nSel       = nMin;

var interval   = 10000;  // in milliseconds
var intervalId;          // start as undefined

function toWhenString(timestamp)
{
    var ts = new Date(1000 * timestamp);
    var now = new Date();
    var diff = now - ts;
    var m, r;

    if (diff < aMinute) {
	r = "just now";
    } else if (diff < twoMinutes) {
	r = "a minute ago";
    } else if (diff < twoHours) {
	m = diff.valueOf() / aMinute;
	r = Math.floor(m) + " minutes ago";
    } else if (diff < twoDays) {
	m = diff.valueOf() / anHour;
	r = Math.floor(m) + " hours ago";
    } else if (diff < twoWeeks) {
	m = diff.valueOf() / aDay;
	r = Math.floor(m) + " days ago";
    } else {
	r = ts.toLocaleDateString();
    }

    return r;
}

function toRefString(ref, minimal)
{
    var patt = new RegExp("^refs/tags/");
    var r, pre;

    if (patt.test(ref) == true) {
	pre = (minimal ? "" : "tag ");
	r = pre + ref.replace("refs/tags/", "");
    } else {
	pre = (minimal ? "" : "branch ");
	r = pre + ref;
    }

    return r;
}

function pushKind(oldSha, newSha)
{
    var noSha = "0000000000000000000000000000000000000000";
    var r = 0;  // by default change ref

    if (oldSha == noSha	&& newSha != noSha) {
	r = 1;  // create ref
    } else if (oldSha != noSha && newSha == noSha) {
	r = 2;  // delete ref
    }

    return r;
}

function getOptions()
{
    var jqxhr = $.getJSON(url, { a : "opt" }, function(data) {
	$.each(data, function(key, val) {
	    switch(key) {
	    case "min":
		nMin = nSel = val;
		break;
	    case "max":
		nMax = val;
		break;
	    case "interval":
		interval = val;
		break;
	    }
	});
    });

    return jqxhr;
}

function updateActivity()
{
    $.getJSON(url, { a : "log", n : nSel }, function(data) {
	var items = [];
	var ts, user, act, pt1, pt2;

	$.each(data, function(tid, item) {
	    ts   = ' <i class="gl-time">' + toWhenString(item.timestamp) + '</i>';
	    user = '<i class="gl-user">' + item.user + '</i> ';

	    switch (item.action) {
	    case "fork":
		act = 'forked a new repo <a href="/?p=' + item.repo + '.git">' + item.repo + '</a>';
		break;
	    case "create":
		act = 'created a new repo <a href="/?p=' + item.repo + '.git">' + item.repo + '</a>';
		break;
	    case "push":
		switch(pushKind(item.oldSha, item.newSha)) {
		case 1:
		    pt1 = 'created ' + toRefString(item.ref, false) + ' at ';
		    pt2 = '<a href="/?p=' + item.repo + '.git;h=' + item.newSha + '">' + item.repo + '</a>';
		    break;
		case 2:
		    pt1 = 'deleted ' + toRefString(item.ref, false) + ' at ';
		    pt2 = '<a href="/?p=' + item.repo + '.git">' + item.repo + '</a>';
		    break;
		default:
		    pt1 = 'pushed to ' + toRefString(item.ref, true) + ' at ';
		    pt2 = '<a href="/?p=' + item.repo + '.git;h=' + item.newSha + '">' + item.repo + '</a>';
		}
		act = pt1.concat(pt2);
		break;
	    default:
		act = 'did something unexpected (<i>internal error</i>)';
	    }

	    items.push("<li>" + user + act + ts + "</li>");
	});

	items.reverse();

	$("#gl-title").filter(":hidden").css("display", "block");
	$("#gl-showall").filter(":hidden").css("display", "block");
	$("#gl-activities-listing").html(function() {
	    return items.join('');
	});

	$("#gl-activities li").filter(function(index) {
	    return index > 0;
	}).addClass("gl-sep");
    });
}

function toggleActivityCount()
{
    nSel = (nSel === nMin ? nMax : nMin);

    if (nSel == nMin) {
	$("#gl-showall").text("more").attr("title", "show more events");
    } else {
	$("#gl-showall").text("less").attr("title", "show less events");
    }
}

function stopActivityUpdate()
{
    if (intervalId !== undefined) {
	clearInterval(intervalId);
    }
}

function startActivityUpdate()
{
    // do initial web part update, then refresh
    // every 'interval' milliseconds
    updateActivity();
    intervalId = setInterval(updateActivity, interval);
}

function activities()
{
    $("#gl-showall").click(function(event) {
	event.preventDefault();
	stopActivityUpdate();
	toggleActivityCount();
	startActivityUpdate();
    });

    if (intervalId === undefined) {
	getOptions().then(startActivityUpdate);
    }
}
