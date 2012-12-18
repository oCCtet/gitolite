#!/bin/sh

# gitolite activities CGI program to construct and return a JSON format
# activities log file containing as many entries as was requested via the
# query parameters

# support only the GET method
if [ "$REQUEST_METHOD" != "GET" ]; then
    echo "Status: 501 Not Implemented"
    echo "Server: $SERVER_SOFTWARE"
    echo ""
    exit 0;
fi


[ -f /etc/gitolite-activities.conf ] && . /etc/gitolite-activities.conf
[ -z "$LOG_FILE" ] && LOG_FILE=/tmp/activities.log

# empty or no log
if [ ! -f $LOG_FILE ] || [ `stat --format=%s $LOG_FILE` -eq 0 ]; then
    echo "Status: 204 No Content"
    echo "Server: $SERVER_SOFTWARE"
    echo ""
    exit 0;
fi

# if the client agent provides the If-Modified-Since request header, take
# advantage of it and optimize the response when possible
log_ts=`stat --format=%Y $LOG_FILE`
if [ -n "$HTTP_IF_MODIFIED_SINCE" ]; then
    since_ts=`date +%s --date="$HTTP_IF_MODIFIED_SINCE"`
    if [ "$since_ts" = "$log_ts" ]; then
	echo "Status: 304 Not Modified"
	echo "Server: $SERVER_SOFTWARE"
	echo ""
	exit 0;
    fi
fi

# the 'n' option may be provided via query parameters to request
# the specified number of log entries
n=`echo "$QUERY_STRING" | sed 's/&/\n/g' | awk 'BEGIN { FS="=" } /^n=[0-9]+$/ { print $2 }'`
[ -z "$n" ] && n=5

# full response
echo "Status: 200 OK"
echo "Cache-Control: no-cache"
echo "Server: $SERVER_SOFTWARE"
echo "Content-type : application/json; charset=utf-8"
echo "Last-Modified: $(date --rfc-2822 --date=@$log_ts)"
echo ""

# for the last n entries, replace transaction id with line number (several
# entries may have the same tid which is illegal for json), then put the rest
# of json document bits in place (curly braces and commas)
tail -n $n $LOG_FILE \
    | sed = | sed -e 'N; s/\n//' -e 's/^\([0-9]*\)"[0-9]*"/"\1"/' \
    | sed '$! s/$/,/' \
    | awk 'BEGIN { RS="#" }; { printf "{\n" $0 "}\n" }' 2>/dev/null

exit 0;
