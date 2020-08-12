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
define("SUNWAIT", exec("command -v sunwait"));
define("PLAY", (PHP_OS_FAMILY == "Darwin" ? exec("command -v afplay") : exec("command -v aplay")." -q"));

//ingest json
if ($argc > 1) {
	$f = $argv[1];
} else {
	$f = CLOCK_ROOT."/system/config.json";
}
$conf = json_decode(file_get_contents($f));

//get variables for comparison
$h12 = (int)date("g");
$h24 = (int)date("G");
$m   = (int)date("i");
$dawn = array(0 => exec(SUNWAIT . " list rise " . $conf->location));
$dusk = array(0 => exec(SUNWAIT . " list set "  . $conf->location));
$now = date("G:i");

//sound selector
$sound = null;

//parse groups recursively
function parse_event($seq,$event,$depth,$path) {
	global $h12, $h24, $m, $dawn, $dusk, $now;
	if ($depth >= MAX_RECURSION_DEPTH)
		exit("reached max recursion depth");
	if (!isset($event->enable) || $event->enable == true) {
		switch ($event->type) {
			case "group":
				foreach ($event->members as $member) {
					parse_event($seq,$member,$depth+1,(empty($path)?"":$path." > ").$event->label);
				}
			break;
			case "event":
				if ($event->sequence == $seq) {
					echo "\t" . $path." > ".$event->label . "\n";
					$match = true;
					if (isset($event->match->date)) {
						switch ($event->match->date->type) {
							case "all":
								$match = true;
							break;
							case "specify":
								$match = false; //FIXME
							break;
							case "easter":
								$match = false; //FIXME
							break;
						}
					}
					if (!$match) return;
					if (isset($event->match->time)) {
						switch ($event->match->time->type) {
							case "specify":
								if (isset($event->match->time->hour)) {
									switch (isset($event->match->time->hour->type)?$event->match->time->hour->type:"") {
										case "all":
											$match = true;
										break;
										case "specify":
										default:
											$match = false;
											switch (isset($event->match->time->hour->format)?$event->match->time->hour->format:"") {
												case "military":
													if ($event->match->time->hour->value == $h24)
														$match = true;
												break;
												case "meridian":
												default:
													if ($event->match->time->hour->value == $h12)
														$match = true;
												break;
											}
										break;
									}
								}
								if (!$match) return;
								if (isset($event->match->time->minute)) {
									switch (isset($event->match->time->minute->type)?$event->match->time->minute->type:"") {
										case "specify":
										default:
											$match = false;
											if ($event->match->time->minute->value == $m)
												$match = true;
										break;
									}
								}
							break;
							case "sun":
								$match = false;
								switch ($event->match->time->event) {
									case "rise":
										if (!isset($dawn[(int)$event->match->time->offset])) {
											$dawn[(int)$event->match->time->offset] = exec(SUNWAIT . " list rise offset " . (int)$event->match->time->offset . " " . $conf->location);
										}
										if ($dawn[(int)$event->match->time->offset] == $now)
											$match = true;
									break;
									case "set":
										if (!isset($dusk[(int)$event->match->time->offset])) {
											$dusk[(int)$event->match->time->offset] = exec(SUNWAIT . " list set offset " . (int)$event->match->time->offset . " " . $conf->location);
										}
										if ($dusk[(int)$event->match->time->offset] == $now)
											$match = true;
									break;
								}
							break;
						}
					}
					if ($match) {
						$sound = $event->file;
					}
				}
			break;
		}
	}
	return;
}

//loop through an abstract sequence of slots 1 through 10, and only play the last matching sound during each time slot
for ($seq=1; $seq<=10; $seq++) {
	echo "Slot " . $seq . ":\n";
	$sound = null;
	foreach ($conf->events as $event) {
		parse_event($seq,$event,0,null);
	}
	if ($sound !== null) {
		switch (isset($sound->relative_to)?$sound->relative_to:"") {
			case "clockworth":
				$file = CLOCK_ROOT."/".$sound->path;
			break;
			case "home":
				$file = "~/".$sound->path;
			break;
			case "root":
				$file = "/".$sound->path;
			break;
			default:
				$file = $sound->path;
			break;
		}
		exec(PLAY." ".$file);
	}
}

?>
