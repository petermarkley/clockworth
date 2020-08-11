#!/bin/php
<?php
/*
#----------------------------------------------------------------------
#                             Clockworth
#          Robotic chiming wall clock made on Raspberry Pi.
#           < https://github.com/petermarkley/clockworth >
# 
# Copyright 2018 by Peter Markley <peter@petermarkley.com>.
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

/*
	// this timezone detection code is taken from:
	// https://bojanz.wordpress.com/2014/03/11/detecting-the-system-timezone-php/
	// and modified for wider compatibility
	$timezone = 'UTC';
	if (is_link('/etc/localtime')) {
		// Mac OS X (and older Linuxes)    
		// /etc/localtime is a symlink to the 
		// timezone in /usr/share/zoneinfo.
		$filename = readlink('/etc/localtime');
		$timezone = substr($filename, strpos($filename, '/usr/share/zoneinfo/') + 20);
	} elseif (file_exists('/etc/timezone')) {
		// Ubuntu / Debian.
		$data = file_get_contents('/etc/timezone');
		if ($data) {
		    $timezone = $data;
		}
	} elseif (file_exists('/etc/sysconfig/clock')) {
		// RHEL / CentOS
		$data = parse_ini_file('/etc/sysconfig/clock');
		if (!empty($data['ZONE'])) {
		    $timezone = $data['ZONE'];
		}
	}
	date_default_timezone_set($timezone);
*/
date_default_timezone_set(exec("timedatectl | grep -i \"time zone\" | cut -d':' -f2 | cut -d' ' -f2"));

echo "hello world\n";
echo date_default_timezone_get() . "\n";

?>
