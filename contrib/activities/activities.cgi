#!/usr/bin/perl

# gitolite activities CGI program to construct and return a JSON format
# activities log file containing as many entries as was requested via the
# query parameters

use strict;
use warnings;

# -----------------------------------------------------
# setup config options and read overrides from the
# config file

my  $config_file    = "/etc/gitolite-activities.conf";
our $log_file       = "/var/log/gitolite/activities.log";
our $min_count      = 7;
our $max_count      = 100;
our $query_interval = 10000;

unless (my $return = do $config_file) {
    warn "Failed to parse $config_file: $@" if $@;
    warn "Failed to do $config_file: $!"    unless defined $return;
    warn "Failed to run $config_file"       unless $return;
}

# -----------------------------------------------------
# CGI status output functions

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

sub not_implemented { print <<EOF;
Status: 501 Not Implemented

EOF
exit;
}

sub send_options { print <<EOF;
Status: 200 OK
Cache-Control: max-age=3600
Content-type : application/json; charset=utf-8

{ "min" : "$min_count", "max" : "$max_count", "interval" : "$query_interval" }
EOF
exit;
}

# -----------------------------------------------------
# parse CGI input and act on it

bad_request() unless defined $ENV{QUERY_STRING};
bad_request() unless defined $ENV{REQUEST_METHOD};

# only the GET method is supported
not_implemented() unless $ENV{REQUEST_METHOD} eq "GET";

# the required 'a' option tells what data to return
(my $action) = ($ENV{QUERY_STRING} =~ /\ba=(log|opt)\b/);
bad_request()  unless defined $action;
send_options() if $action eq "opt";

# empty or no log
no_content() unless -s $log_file;

# if the client agent provides the If-Modified-Since request
# header, take advantage of it and optimize the response
# when possible
my $log_timestamp = (stat(_))[9];
not_modified()
    if defined $ENV{HTTP_IF_MODIFIED_SINCE}
    and $log_timestamp == `date +%s --date="$ENV{HTTP_IF_MODIFIED_SINCE}"`;

# the optional 'n' option tells the amount of entries to return
my $entry_count   = ($ENV{QUERY_STRING} =~ /\bn=(\d+)\b/) ? $1 : $min_count;
my $last_modified = `date --rfc-2822 --date=\@$log_timestamp`;

# -----------------------------------------------------
# full response

print <<EOF;
Status: 200 OK
Cache-Control: no-cache
Content-type : application/json; charset=utf-8
Last-Modified: $last_modified

EOF

# for the last entry_count entries, replace transaction
# id with line number (several entries may have the same
# tid which is illegal for json), and put the rest of the
# json document bits in place (curly braces and commas)
open(my $in, "<", $log_file) or die "Failed to open log: $!";

my @lines = reverse <$in>;
my $count = 0;
print "{\n";

LINE: foreach my $line (@lines) {
    last if ++$count > $entry_count;
    $line =~ s/^"\d+"/"$count"/;
    $line =~ s/$/,/ if $count < $entry_count and $count < @lines;
    print $line;
}

print "}\n";
close $in or die "$in: $!";
