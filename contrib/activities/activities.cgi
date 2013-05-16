#!/usr/bin/perl

# Gitolite activities CGI program to construct and return a JSON format
# activities log file containing as many entries as was requested via the
# query parameters.
#
# Supports per-repo authorization using gitolite v3 access rules.

use strict;
use warnings;

# -----------------------------------------------------

# Configurable options via the optional $config_file.
# If the file is missing or unreadable, fall back to
# reasonably sane (safe) defaults.
my $config_file = "/etc/gitolite-activities.conf";

# Log file must be readable by the user running this CGI
# program. The path must also be in sync with gitolite
# 'activities' trigger program's ACTIVITIES_LOG_FILE option.
our $log_file = "/var/log/gitolite/activities.log";

# Minimum (default) amount of log entries to send. If the
# client does not specify the amount (via the n query option),
# this value shall be used.
our $min_count = 7;

# Maximum amount of log entries to send. Used only in replying
# to the a=opt query.
our $max_count = 100;

# Proposed query interval, used only in replying to the a=opt
# query.
our $query_interval = 10000;

# Authorization hook function, must return true if the user is
# authorized, and false if not.
our $repo_auth_hook = undef;

unless (my $return = do $config_file) {
    warn "Failed to parse $config_file: $@" if $@;
    warn "Failed to do $config_file: $!"    unless defined $return;
    warn "Failed to run $config_file"       unless $return;
}

# -----------------------------------------------------

# Access check function, calls the $repo_auth_hook on
# each repo and returns true if the user is authorized
# to see activities on that repo.
# (If the hook is undefined, returns true.)
sub check_repo_auth {
    my ($repo) = @_;
    return (!$repo_auth_hook || $repo_auth_hook->($repo));
}

# -----------------------------------------------------

# CGI status output functions for the various error
# situations.

sub no_content { print <<EOF;
Status: 204 No Content

EOF
exit;
}

sub not_modified { print <<EOF;
Status: 304 Not Modified

EOF
exit;
}

sub bad_request { print <<EOF;
Status: 400 Bad Request

EOF
exit;
}

sub forbidden { print <<EOF;
Status: 403 Forbidden

Accessing log file: $!
EOF
exit;
}

sub not_implemented { print <<EOF;
Status: 501 Not Implemented

EOF
exit;
}

# Send options json document, called to form a reply
# for the a=opt query.
sub send_options { print <<EOF;
Status: 200 OK
Cache-Control: max-age=3600
Content-Type : application/json; charset=utf-8

{ "min" : "$min_count", "max" : "$max_count", "interval" : "$query_interval" }
EOF
exit;
}

sub send_userinf {
    my $valid_user = $ENV{REMOTE_USER} ne '' ? 'true' : 'false';
    my $auth_user  = $ENV{REMOTE_USER} || "(unauthenticated)";
    print <<EOF;
Status: 200 OK
Cache-Control: public, no-cache
Content-Type : application/json; charset=utf-8

{ "is_valid_user" : $valid_user, "username" : "$auth_user" }
EOF
exit;
}

# -----------------------------------------------------

# Parse CGI input, supporting only the GET method and
# requiring a query string with at least the 'a' option.
bad_request()     unless defined $ENV{QUERY_STRING};
bad_request()     unless defined $ENV{REQUEST_METHOD};
not_implemented() unless $ENV{REQUEST_METHOD} eq "GET";

my ($action) = ($ENV{QUERY_STRING} =~ /\ba=(log|opt|user)\b/a);
bad_request()  unless defined $action;
send_options() if $action eq "opt";
send_userinf() if $action eq "user";

# Verify $log_file exists and is non-empty. Also fills
# the stat(_) data for subsequent use.
no_content() unless -s $log_file;

# If the client agent provides the If-Modified-Since
# request header, take advantage of it and optimize the
# response when possible.
my $log_timestamp = (stat(_))[9];
not_modified()
    if defined $ENV{HTTP_IF_MODIFIED_SINCE}
    and $log_timestamp == `date +%s --date="$ENV{HTTP_IF_MODIFIED_SINCE}"`;

# The optional 'n' query option tells the amount of
# entries to return; if unset, use $min_count.
my $entry_count   = ($ENV{QUERY_STRING} =~ /\bn=(\d+)\b/a) ? $1 : $min_count;
my $last_modified = `date --rfc-2822 --date=\@$log_timestamp`;

# -----------------------------------------------------

# Read the log file entirely in memory, reversing line
# order.
open(my $in, "<", $log_file) or forbidden();

my @lines = reverse <$in>;
my @result;
my $count = 0;

close($in) or warn "$in: $!";

# For authorized repos, replace transaction id with a line
# number (several entries may have the same tid which is
# illegal for json), and store them into the @result array.
foreach my $line (@lines) {
    my ($repo) = ($line =~ /"repo"\s*:\s*"([^"]+)"/a);
    next unless check_repo_auth($repo);
    last if ++$count > $entry_count;

    $line =~ s/^"\d+"/"$count"/a;
    $result[$count - 1] = $line;
}

# Output the full response.
print <<EOF;
Status: 200 OK
Cache-Control: no-cache
Content-Type : application/json; charset=utf-8
Last-Modified: $last_modified

EOF
print "{ " . join(', ', @result) . "}\n";
