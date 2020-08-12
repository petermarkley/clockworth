#!/bin/bash

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

PATH="/opt/local/bin:$PATH" #for MacPorts
PATH="/usr/local/bin:$PATH" #for Linux

CONFIG_FILE=~/.clockworth_config

COORDS=""
if [ -e "$CONFIG_FILE" ] ; then
	COORDS=`grep -i "location=" $CONFIG_FILE | cut -d= -f2` #user-defined coordinates
fi
if [ -z "$COORDS" ] ; then
	COORDS=`curl -s http://freegeoip.net/csv/ | rev | cut -d, -f3,2 | rev | sed -E 's/(.*)\,(.*)/\1N \2E/'` #coordinates by IP
fi
if [ -z "$COORDS" ] ; then
	COORDS="0.00N $( echo "(`date +%-z`-100)*180/1200" | bc -l )E" #last resort coordinates from UTC offset
fi

DIR="$( cd "$( dirname "$( dirname "$0" )" )" && pwd )"
SUNWAIT=`command -v sunwait`
PLAY=`command -v aplay`" -q" #for Linux
if [ $? -eq 1 ] ; then
	PLAY=`command -v afplay` #for macOS
fi

DAWN=`$SUNWAIT list rise $COORDS`
DUSK=`$SUNWAIT list set  $COORDS`
NOW=`date +%R`

if [[ "$NOW" == "$DAWN" || "$NOW" == "$DUSK" ]] ; then
	
	DAWN_SND="${DIR}/sounds/drafts/suns_song.wav"
	DUSK_SND="${DIR}/sounds/drafts/god_be_with_you.wav"
	M=`date +%m`
	D=`date +%d`
	if [ $M -eq 11 ] ; then
		if [ $D -gt 21 -a $D -lt 29 -a `date +%w` -eq 4 ] ; then
			DAWN_SND="${DIR}/sounds/drafts/he_has_made_me_glad.wav"
			DUSK_SND="${DIR}/sounds/drafts/count_your_blessings.wav"
		fi
	else
		if [ $M -eq 12 -a $D -eq 25 ] ; then
			DAWN_SND="${DIR}/sounds/drafts/joy_to_the_world.wav"
			DUSK_SND="${DIR}/sounds/drafts/silent_night.wav"
		else
			EASTER=`${DIR}/scripts/easter.py`
			ME=`echo ${EASTER} | cut -d' ' -f2 | cut -d, -f1`
			DE=`echo ${EASTER} | cut -d' ' -f3 | cut -d\) -f1`
			if [ $M -eq $ME -a $D -eq $DE ] ; then
				DAWN_SND="${DIR}/sounds/drafts/christ_arose-dawn.wav"
				DUSK_SND="${DIR}/sounds/drafts/christ_arose-dusk.wav"
			fi
		fi
	fi
	
	if [[ "$NOW" == "$DAWN" ]] ; then
		( $PLAY $DAWN_SND & )
	else
		if [[ "$NOW" == "$DUSK" ]] ; then
			( $PLAY $DUSK_SND & )
		fi
	fi
	
fi
