#!/bin/php
<?php
//----------------------------------------------------------------------
//                             Clockworth
//          Robotic chiming wall clock made on Raspberry Pi.
//           < https://github.com/petermarkley/clockworth >
// 
// Copyright 2020 by Peter Markley <peter@petermarkley.com>.
// Distributed under the terms of the Lesser GNU General Public License.
// 
// This file is part of Clockworth.
// 
// Clockworth is free software: you can redistribute it and/or modify it
// under the terms of the Lesser GNU General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// Clockworth is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// Lesser GNU General Public License for more details.
// 
// You should have received a copy of the Lesser GNU General Public
// License along with libmcmap.  If not, see
// < http://www.gnu.org/licenses/ >.
// 
//----------------------------------------------------------------------
date_default_timezone_set(exec("timedatectl | grep -i \"time zone\" | cut -d':' -f2 | cut -d' ' -f2"));

define("MAX_RECURSION_DEPTH", "100");
define("CLOCK_ROOT", dirname(__DIR__));
define("SUNWAIT", exec("command -v sunwait"));
define("PLAY", (PHP_OS_FAMILY == "Darwin" ? exec("command -v afplay") : exec("command -v aplay")." -q"));

//parse arguments
$opt = getopt("f:t:hv",array("file:","time:","help","verbose"));
if (isset($opt["h"]) || isset($opt["help"])) {
	echo "\nusage:\n\t-h, --help   Display this message.\n\t-f <file>, --file <file>   Use specified config file instead of default.\n\t-t <time>, --time <time>   Run script on simulated date/time, parsed with PHP function strtotime().\n\t-v, --verbose   Print messages about script results.\n\n";
	exit();
}
if (isset($opt["v"]) || isset($opt["verbose"])) {
	$v = true;
} else {
	$v = false;
}

//ingest json
if (isset($opt["f"])) {
	$f = $opt["f"];
} else if (isset($opt["file"])) {
	$f = $opt["file"];
} else {
	$f = CLOCK_ROOT."/system/config.json";
}
if ($v) echo "  File: ".$f."\n";
$conf = json_decode(file_get_contents($f));

//get variables for comparison
if (isset($opt["t"])) {
	$t = strtotime($opt["t"]);
} else if (isset($opt["time"])) {
	$t = strtotime($opt["time"]);
} else {
	$t = time();
}
if ($v) echo "  Time: ".$t." (".date("D Y-m-d h:ia T",$t).")\n";
$h12  = (int)date("g", $t);
$h24  = (int)date("G", $t);
$m    = (int)date("i", $t);
$now  = date("G:i", $t);
$monn = (int)date("n", $t);
$mona = date("M", $t);
$day  = (int)date("j", $t);
$week = date("D", $t);
$year = (int)date("Y", $t);
if (isset($opt["t"]) || isset($opt["time"])) {
	$dawn = array(0 => exec(SUNWAIT . " list rise d " . $day . " m " . $monn . " y " . ($year-2000) . " " . $conf->location));
	$dusk = array(0 => exec(SUNWAIT . " list set d " . $day . " m " . $monn . " y " . ($year-2000) . " "  . $conf->location));
} else {
	$dawn = array(0 => exec(SUNWAIT . " list rise " . $conf->location));
	$dusk = array(0 => exec(SUNWAIT . " list set "  . $conf->location));
}
if ($v) echo "   Sun: rise ".$dawn[0].", set ".$dusk[0]."\n";
$easter = explode(", ",exec(CLOCK_ROOT."/scripts/easter.py"));
$easter_mon = (int)$easter[1];
$easter_day = (int)$easter[2];
if ($v) echo "Easter: ".$easter_mon."/".$easter_day."\n";

//sound selector
$sound = null;

//parse groups recursively
function parse_event($seq,$event,$depth,$path) {
	global $v;
	global $h12, $h24, $m, $dawn, $dusk, $now, $monn, $mona, $day, $week, $easter_mon, $easter_day;
	global $sound;
	if ($depth >= MAX_RECURSION_DEPTH)
		exit("reached max recursion depth");
	if (!isset($event->enable) || $event->enable == true) {
		switch ($event->type) {
			case "group":
				foreach ($event->members as $member) {
					parse_event($seq,$member,$depth+1,(empty($path)?"":$path." \u{2192} ").$event->label);
				}
			break;
			case "event":
				if ($event->sequence == $seq) {
					$event->{"path"} = $path." \u{2192} ".$event->label;
					if ($v) echo "\t" . $event->path;
					$match = true;
					if (isset($event->match->date)) {
						switch ($event->match->date->type) {
							case "all":
								$match = true;
							break;
							case "specify":
								$match = false;
								switch (isset($event->match->date->month->type)?$event->match->date->month->type:"") {
									case "specify":
									default:
										if ($event->match->date->month->value == $mona) {
											$match = true;
										}
									break;
								}
								if ($match) {
									$match = false;
									switch (isset($event->match->date->day->type)?$event->match->date->day->type:"") {
										case "floating":
											if ($event->match->date->day->value == $week) {
												if ($day > ($event->match->date->day->ordinal-1)*7 && $day <= $event->match->date->day->ordinal*7) {
													$match = true;
												}
											}
										break;
										case "fixed":
										default:
											if ($event->match->date->day->value == $day) {
												$match = true;
											}
										break;
									}
								}
							break;
							case "easter":
								$match = false;
								switch ($event->match->date->variant) {
									case "western":
										if ($easter_mon == $monn && $easter_day == $day) {
											$match = true;
										}
									break;
								}
							break;
						}
					}
					if ($match) {
						$match = false;
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
									if ($match) {
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
							$sound = $event;
							if ($v) echo "    [MATCH]";
						}
					}
					if ($v) echo "\n";
				}
			break;
		}
	}
	return;
}

//loop through a sequence of slots 1 through 10, and only play the last matching sound during each sequence slot
if ($v) echo "\n";
for ($seq=1; $seq<=10; $seq++) {
	if ($v) echo "Slot " . $seq . ":\n";
	$sound = null;
	foreach ($conf->events as $event) {
		parse_event($seq,$event,0,null);
	}
	if ($sound !== null) {
		if ($v) echo "\n\tLast match:  " . $sound->path . "\n";
		switch (isset($sound->file->relative_to)?$sound->file->relative_to:"") {
			case "clockworth":
				$file = CLOCK_ROOT."/".$sound->file->path;
			break;
			case "home":
				$file = "~/".$sound->file->path;
			break;
			case "root":
				$file = "/".$sound->file->path;
			break;
			default:
				$file = $sound->file->path;
			break;
		}
		exec(PLAY." ".$file);
	}
}

?>
