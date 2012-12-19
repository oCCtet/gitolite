// gl-activities javascript (C) 2012 Sami Hartikainen <sami.a.hartikainen@gmail.com>
// uses the jQuery javascript library

// Get the activities JSON document from the server and render
// it to the table with id 'gl-activities-listing', refreshing
// the web part periodically.

var aMinute    = 60000;      // 1000 * 60
var twoMinutes = 120000;     // aMinute * 2
var anHour     = 3600000;    // aMinute * 60
var twoHours   = 7200000;    // anHour * 2
var aDay       = 86400000;   // anHour * 24
var twoDays    = 172800000;  // aDay * 2
var aWeek      = 604800000;  // aDay * 7
var twoWeeks   = 1209600000; // aWeek * 2

var condensed     = 7;
var expanded      = 100;
var activityCount = condensed;

var url = "/cgi-bin/activities.cgi";

var interval   = 10000;  // ten seconds (in milliseconds)
var intervalId;          // undefined to begin with

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

function updateActivity()
{
    $.getJSON(url, { n : activityCount }, function(data) {
	var items = [];
	var ts, user, act, pt1, pt2;

	$.each(data, function(tid, item) {
	    ts   = '<td class="gl-time">' + toWhenString(item.timestamp) + '</td>';
	    user = '<td class="gl-user">' + item.user + '</td>';

	    switch (item.action) {
	    case "fork":
		act = '<td>forked a new repo <a href="/?p=' + item.repo + '">' + item.repo + '</a></td>';
		break;
	    case "create":
		act = '<td>created a new repo <a href="/?p=' + item.repo + '">' + item.repo + '</a></td>';
		break;
	    case "push":
		if (isDelete(item.oldSha, item.newSha)) {
		    pt1 = '<td>deleted <i class="gl-ref">' + toRefString(item.ref) + '</i> from ';
		    pt2 = '<a href="/?p=' + item.repo + '">' + item.repo + '</a></td>';
		} else {
		    pt1 = '<td>pushed <i class="gl-ref">' + toRefString(item.ref) + '</i> to ';
		    pt2 = '<a href="/?p=' + item.repo + ';h=' + item.newSha + '">' + item.repo + '</a></td>';
		}
		act = pt1.concat(pt2);
		break;
	    default:
		act = '<td class="gl-act">did something unexpected (<i>internal error</i>)</td>';
	    }

	    items.push("<tr>" + ts + user + act + "</tr>");
	});

	items.reverse();

	$("#gl-title").filter(":hidden").css("display", "block");
	$("#gl-showall").filter(":hidden").css("display", "block");
	$("#gl-activities-listing").html(function() {
	    return items.join('');
	});

	$("#gl-activities tr").filter(":even").addClass("gl-dark");
    });
}

function toggleActivityCount()
{
    activityCount = (activityCount === condensed ? expanded : condensed);

    switch (activityCount) {
    case condensed:
	$("#gl-showall").text("more").attr("title", "show " + expanded + " most recent events");
	break;
    default:
	$("#gl-showall").text("less").attr("title", "show " + condensed + " most recent events");
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
	startActivityUpdate();
    }
}
