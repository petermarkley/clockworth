#!/bin/bash

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

CONFIG_FILE=~/.clockworth_config

DIR="$( cd "$( dirname "$( dirname "$0" )" )" && pwd )"
PLAY=`command -v aplay`" -q" #for Linux
if [ $? -eq 1 ] ; then
	PLAY=`command -v afplay` #for macOS
fi

while true ; do
	if [ -e "$CONFIG_FILE" ] ; then
		OPT=`grep -i "tick=" $CONFIG_FILE | cut -d= -f2`
		if [ -n "$OPT" ] ; then
			shopt -s nocasematch
			if [[ "$OPT" == "off" || "$OPT" == "no" || "$OPT" == "false" ]] ; then
				exit
			fi
		fi
	fi
	T=$(( $( date +%s ) / 2 + 1 ))
	$PLAY "${DIR}/sounds/tick_tock-var$(( ( RANDOM % 5 ) + 1 )).wav"
	while [ `date +%s` -lt $(( $T * 2 )) ] ; do sleep 0.01 ; done
done
