// gl-activities javascript (C) 2012 Sami Hartikainen <sami.a.hartikainen@gmail.com>
// uses the jQuery javascript library

// Get the activities JSON document from the server and render
// it to the table with class 'gl_activities', refreshing the
// web part periodically.

var aMinute    = 60000;     // 1000 * 60
var twoMinutes = 120000;    // aMinute * 2
var anHour     = 3600000;   // aMinute * 60
var twoHours   = 7200000;   // anHour * 2
var aDay       = 86400000;  // anHour * 24
var twoDays    = 172800000; // aDay * 2
var aWeek      = 604800000; // aDay * 7

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
    } else if (diff < anHour) {
	m = diff.valueOf() / aMinute;
	r = Math.floor(m) + " minutes ago";
    } else if (diff < twoHours) {
	r = "an hour ago";
    } else if (diff < aDay) {
	m = diff.valueOf() / anHour;
	r = Math.floor(m) + " hours ago";
    } else if (diff < twoDays) {
	r = "a day ago";
    } else if (diff < aWeek) {
	m = diff.valueOf() / aDay;
	r = Math.floor(m) + " days ago";
    } else {
	r = ts.toLocaleDateString();
    }

    return r;
}

function toRefString(ref)
{
    var patt = new RegExp("^refs/tags/");
    var r;

    if (patt.test(ref) == true) {
	r = "tag " + ref.replace("refs/tags/", "");
    } else {
	r = "branch " + ref;
    }

    return r;
}

function isDelete(oldSha, newSha)
{
    return (oldSha != "0000000000000000000000000000000000000000"
	    && newSha == "0000000000000000000000000000000000000000");
}

function updateActivityPart(url)
{
    $.getJSON(url, function(data) {
	var items = [];
	var ts, user, act, pt1, pt2, pt3;

	$.each(data, function(tid, item) {
	    ts   = '<td class="time">' + toWhenString(item.timestamp) + '</td>';
	    user = '<td class="user">' + item.user + '</td>';

	    switch (item.action) {
	    case "fork":
		act = '<td class="act">forked a new repo <a href="/?p=' + item.repo + '">' + item.repo + '</a></td>';
		break;
	    case "create":
		act = '<td class="act">created a new repo <a href="/?p=' + item.repo + '">' + item.repo + '</a></td>';
		break;
	    case "push":
		if (isDelete(item.oldSha, item.newSha)) {
		    pt1 = '<td class="act">deleted <i class="ref">' + toRefString(item.ref) + '</i> from ';
		    pt2 = '<a href="/?p=' + item.repo + '">' + item.repo + '</a><br />';
		} else {
		    pt1 = '<td class="act">pushed <i class="ref">' + toRefString(item.ref) + '</i> to ';
		    pt2 = '<a href="/?p=' + item.repo + ';h=' + item.newSha + '">' + item.repo + '</a><br />';
		}
		pt3 = '<i class="sha">oldSha: ' + item.oldSha + '<br />newSha: ' + item.newSha + '</i></td>';
		act = pt1.concat(pt2, pt3);
		break;
	    default:
		act = '<td class="act">did something unexpected (<i>internal error</i>)</td>';
	    }

	    items.push("<tr>" + ts + user + act + "</tr>");
	});

	items.reverse();

	$(".gl_title").filter(":hidden").css("display", "block");
	$(".gl_activities").html(function() {
	    return items.join('');
	});

	$(".gl_activities tr").filter(":even").addClass("dark");
    });
}

function activities(interval)
{
    var url = "/activities/activities.json";

    // initial web part update
    updateActivityPart(url);

    // then refresh every 'interval' seconds
    setInterval(function(){ updateActivityPart(url) }, interval * 1000);
}
