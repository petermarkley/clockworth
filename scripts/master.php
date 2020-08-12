#!/bin/php
<?php
/*
#----------------------------------------------------------------------
#                             Clockworth
#          Robotic chiming wall clock made on Raspberry Pi.
#           < https://github.com/petermarkley/clockworth >
# 
# Copyright 2020 by Peter Markley <peter@petermarkley.com>.
# Distributed under the terms of the Lesser GNU General Public License.
# 
# This file is part of Clockworth.
# 
# Clockworth is free software: you can redistribute it and/or modify it
# under the terms of the Lesser GNU General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
# 
# Clockworth is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# Lesser GNU General Public License for more details.
# 
# You should have received a copy of the Lesser GNU General Public
# License along with libmcmap.  If not, see
# < http://www.gnu.org/licenses/ >.
# 
#----------------------------------------------------------------------
*/
date_default_timezone_set(exec("timedatectl | grep -i \"time zone\" | cut -d':' -f2 | cut -d' ' -f2"));

define("MAX_RECURSION_DEPTH", "100");
define("CLOCK_ROOT", dirname(__DIR__));

//ingest json
if ($argc > 1) {
	$f = $argv[1];
} else {
	$f = CLOCK_ROOT."/system/config.json";
}
$conf = json_decode(file_get_contents($f));

//parse groups recursively
function parse_event($seq,$event,$depth,$path) {
	if ($depth >= MAX_RECURSION_DEPTH)
		exit("reached max recursion depth");
	if (!isset($event->enable) || $event->enable == true) {
		switch ($event->type) {
			case "group":
				foreach ($event->members as $member) {
					parse_event($seq,$member,$depth+1,(empty($path)?"":$path."/").$event->label);
				}
			break;
			case "event":
				if ($event->sequence == $seq) {
					echo "\t" . $path."/".$event->label . "\n";
				}
			break;
		}
	}
	return;
}

//loop through an abstract sequence of slots 1 through 10, and only play applicable sounds during their specified time slot
for ($seq=1; $seq<=10; $seq++) {
	echo "Slot " . $seq . ":\n";
	foreach ($conf->events as $event) {
		parse_event($seq,$event,0,null);
	}
}

?>
