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



#chime quarters & hours
#----------------------

MINUTE=`date +%M`
OPTA=1
if [ -e "$CONFIG_FILE" ] ; then
	TMP=`grep -i "chime-hours=" $CONFIG_FILE | cut -d= -f2`
	if [ -n "$TMP" ] ; then
		shopt -s nocasematch
		if [[ "$TMP" == "off" || "$TMP" == "no" || "$TMP" == "false" ]] ; then
			OPTA=0
		fi
	fi
fi
if [[ "$MINUTE" == "15" || "$MINUTE" == "30" || "$MINUTE" == "45" ]] ; then
	OPTB=1
	if [ -e "$CONFIG_FILE" ] ; then
		TMP=`grep -i "chime-quarters=" $CONFIG_FILE | cut -d= -f2`
		if [ -n "$TMP" ] ; then
			shopt -s nocasematch
			if [[ "$TMP" == "off" || "$TMP" == "no" || "$TMP" == "false" ]] ; then
				OPTB=0
			fi
		else
			if [ $OPTA -eq 0 ] ; then OPTB=0 ; fi
		fi
	fi
	if [ $OPTB -eq 1 ] ; then $PLAY "${DIR}/sounds/drafts/westminster_${MINUTE}.wav" ; fi
else
	if [[ "$MINUTE" == "00" ]] ; then
		if [ $OPTA -eq 1 ] ; then $PLAY "${DIR}/sounds/drafts/westminster_hr_`date +%I`.wav" ; fi
	fi
fi



#chime dawn & dusk
#-----------------

OPT=1
if [ -e "$CONFIG_FILE" ] ; then
	TMP=`grep -i "chime-sun=" $CONFIG_FILE | cut -d= -f2`
	if [ -n "$TMP" ] ; then
		shopt -s nocasematch
		if [[ "$TMP" == "off" || "$TMP" == "no" || "$TMP" == "false" ]] ; then
			OPT=0
		fi
	fi
fi
if [ $OPT -eq 1 ] ; then source "${DIR}/scripts/sun.sh" ; fi
