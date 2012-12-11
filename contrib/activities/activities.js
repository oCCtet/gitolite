// gl-activities javascript (C) 2012 Sami Hartikainen <sami.a.hartikainen@gmail.com>
// uses the jQuery javascript library

// Get the activities JSON document from the server and render
// it to the table with class 'gl_activities', refreshing the
// web part periodically.

function toTimestamp(timestamp)
{
    var ts = new Date(1000 * timestamp);
    return ts.toString();
}

function updateActivityPart(url)
{
    $.getJSON(url, function(data) {
	var items = [];
	var ts, user, act, ext;

	$.each(data, function(timestamp, item) {
	    ts   = '<td class="time">' + toTimestamp(timestamp) + '</td>';
	    user = '<td class="user">' + item.user + '</td>';
	    ext  = "";

	    switch (item.action) {
	    case "fork":
		act = '<td class="act">forked a new repo <i>' + item.repo + '</i></td>';
		break;
	    case "create":
		act = '<td class="act">created a new repo <i>' + item.repo + '</i></td>';
		break;
	    case "push":
		act = '<td class="act">pushed <tt>' + item.ref + '</tt> to <i>' + item.repo + '</i><br />';
		ext = '<tt class="detail">oldSha: ' + item.oldSha + '<br />newSha: ' + item.newSha + '</tt></td>';
		break;
	    default:
		act = '<td class="act">did something unexpected (<i>internal error</i>)</td>';
	    }

	    items.push('<tr>' + ts + user + act + ext + '</tr>');
	});

	items.reverse();

	$(".gl_title:hidden").css("display", "block");
	$(".gl_activities").html(function() {
	    return items.join('');
	});
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
