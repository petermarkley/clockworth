//----------------------------------------------------------------------
//                             Clockworth
//          Robotic chiming wall clock made on Raspberry Pi.
//           < https://github.com/petermarkley/clockworth >
// 
// Copyright 2018 by Peter Markley <peter@petermarkley.com>.
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

// https://elinux.org/RPi_GPIO_Code_Samples#C
#include <stdio.h>
#include <stdlib.h>
#include <pigpio.h>
#include <math.h>
#include <sys/time.h>
#include <signal.h>
#include <string.h>
#define PI 3.14159265358979323

// https://www.parallax.com/downloads/parallax-feedback-360%C2%B0-high-speed-servo-product-guide
#define SMOOTH_SAMPLES     100
#define UPPER_LIMIT         98.0 //percentage of a turn
#define LOWER_LIMIT          4.0 //percentage of a turn
#define FRICTION_THRESHOLD   0.3 //percentage of a turn
#define MAX_VELOCITY        30   //microseconds of pulse width
#define MAX_ACCELERATION   300   //microseconds per hundred cycles
#define SHARE_COUNT 10 //number of cycles after which toggling hands is forced

#define RANGE (UPPER_LIMIT-LOWER_LIMIT)
#define HALF (((double)RANGE)/2.0)

typedef enum
	{
	FLAG_NONE,
	FLAG_SPIN,
	FLAG_HOME
	} flag_state;
flag_state flag;

typedef enum
	{
	HAND_HOUR,
	HAND_MINUTE,
	HAND_SECOND
	} hand_type;
struct ctl
	{
	unsigned int gpio;
	double target_pos;
	double speed;
	int speed_ctl;
	};
struct fdb
	{
	unsigned int gpio;
	uint32_t rise;
	uint32_t fall;
	double samples[SMOOTH_SAMPLES];
	double value;
	};
struct hand
	{
	hand_type type;
	struct ctl ctl;
	struct fdb fdb;
	};

struct hand *h, *m;
int br = 0;

void getfdb(int gpio, int level, uint32_t tick, void *data)
	{
	struct fdb *c = (struct fdb *)data;
	int i;
	switch (level)
		{
		case 0:
			c->fall = tick;
			for (i = SMOOTH_SAMPLES-1; i > 0; i--)
				c->samples[i] = c->samples[i-1];
			c->samples[0] = 100.0*((double)(c->fall - c->rise))/1099.0; //1099 is the period of the 910Hz feedback wave in microseconds
			c->value = 0.0;
			for (i=0;i<SMOOTH_SAMPLES;i++)
				c->value += c->samples[i];
			c->value = c->value / ((double)SMOOTH_SAMPLES);
		break;
		case 1:
			c->rise = tick;
		break;
		case 2:
		default: break;
		}
   return;
	}

int sendctl(struct hand *c)
	{
	time_t now;
	struct tm *tm;
	double target_pos,     pos_diff;
	double target_speed, speed_diff;
	int speed_ctl=1500;
	if (c != NULL)
		{
		//target position
		switch (flag)
			{
			case FLAG_NONE:
				now = time(0);
				if ((tm = localtime(&now)) == NULL)
					{
					fprintf(stderr,"localtime() failed\n");
					return 1;
					}
				switch (c->type)
					{
					case HAND_HOUR:
						target_pos = RANGE*(((double)(tm->tm_hour%12))/12.0+((double)tm->tm_min)/720.0+((double)tm->tm_sec)/43200.0) + LOWER_LIMIT;
					break;
					case HAND_MINUTE:
						target_pos = RANGE*(((double)tm->tm_min)/60.0+((double)tm->tm_sec)/3600.0) + LOWER_LIMIT;
					break;
					case HAND_SECOND:
						target_pos = RANGE*((double)tm->tm_sec)/60.0 + LOWER_LIMIT;
					break;
					default: break;
					}
			break;
			case FLAG_HOME:
				target_pos = LOWER_LIMIT;
			break;
			default: break;
			}
		
		//target speed
		pos_diff = target_pos - c->fdb.value;
		if (fabs(pos_diff) > HALF)
			{
			if (pos_diff > 0.0)
				pos_diff = +HALF-pos_diff;
			else
				pos_diff = -HALF-pos_diff;
			}
		if (fabs(pos_diff) > FRICTION_THRESHOLD)
			{
			if (pos_diff > 0.0)
				target_speed = ((double)MAX_VELOCITY)*fmin(pos_diff/(RANGE/30.0),+1.0);
			else
				target_speed = ((double)MAX_VELOCITY)*fmax(pos_diff/(RANGE/30.0),-1.0);
			speed_diff = target_speed - c->ctl.speed;
			if (speed_diff > 0.0)
				c->ctl.speed += fmin(speed_diff,+((double)MAX_ACCELERATION)/100.0);
			else
				c->ctl.speed += fmax(speed_diff,-((double)MAX_ACCELERATION)/100.0);
			if (c->ctl.speed > 0.0)
				speed_ctl = 1480-(int)round(c->ctl.speed);
			else if (c->ctl.speed < 0.0)
				speed_ctl = 1520-(int)round(c->ctl.speed);
			}
		else
			{
			c->ctl.speed = 0.0;
			speed_ctl = 1500;
			}
		c->ctl.target_pos = target_pos;
		c->ctl.speed_ctl = speed_ctl;
	
		//update signal
		gpioPWM(c->ctl.gpio,speed_ctl);
		}
	return (speed_ctl == 1500); //return 1 if we're good to switch hands next cycle
	}

struct hand *inithand(unsigned int gpio_ctl, unsigned int gpio_fdb, hand_type type)
	{
	struct hand *c;
	int i;
	if ((c = (struct hand *)calloc(1,sizeof(struct hand))) == NULL)
		{
		fprintf(stderr,"calloc() returned NULL\n");
		return NULL;
		}
	c->type = type;
	c->fdb.rise=0;
	c->fdb.fall=0;
	for (i=0;i<SMOOTH_SAMPLES;i++)
		c->fdb.samples[i] = 0.0;
	c->fdb.value=0.0;
	c->ctl.gpio = gpio_ctl;
	c->fdb.gpio = gpio_fdb;
	c->ctl.speed = 0.0;
	gpioSetMode        (c->ctl.gpio,PI_OUTPUT);
	gpioSetPWMfrequency(c->ctl.gpio,50);
	gpioSetPWMrange    (c->ctl.gpio,20000);
	gpioSetMode        (c->fdb.gpio,PI_INPUT);
	gpioSetAlertFuncEx (c->fdb.gpio,getfdb,(void *)&(c->fdb));
	return c;
	}

void uninitialize(int signum, siginfo_t *info, void *context)
	{
	free(h); h=NULL;
	free(m); m=NULL;
	gpioTerminate();
	br=1;
	exit(0);
	return;
	}

int main(int argc, char *argv[])
	{
	int toggle, count, i, p;
	struct hand *last;
	struct sigaction sig;
	
	//parse input
	flag = FLAG_NONE;
	p=0;
	for (i=1; i<argc; i++)
		{
		if (strcasecmp(argv[i],"spin") == 0)
			flag = FLAG_SPIN;
		else if (strcasecmp(argv[i],"home") == 0)
			flag = FLAG_HOME;
		else if (strcasecmp(argv[i],"print") == 0)
			p=1;
		}
	
	//initialize
	if (gpioInitialise() < 0)
		{
		fprintf(stderr,"pigpio initialization failed\n");
		return 1;
		}
	sig.sa_sigaction = uninitialize;
	sig.sa_flags = SA_SIGINFO;
	sigaction(SIGHUP, &sig,NULL);
	sigaction(SIGINT, &sig,NULL);
	sigaction(SIGTERM,&sig,NULL);
	if ((h = inithand(27,17,HAND_HOUR)  ) == NULL ||
	    (m = inithand(24,23,HAND_MINUTE)) == NULL)
		return 1;
	
	//cycle
	last = h;
	toggle = count = 0;
	while (!br)
		{
		switch (flag)
			{
			case FLAG_NONE:
			case FLAG_HOME:
				if (toggle) count=0;
				else
					{
					if (count > SHARE_COUNT)
						{
						toggle=1;
						count=0;
						}
					else
						count++;
					}
				if (last == h)
					toggle = sendctl(last = toggle?m:h);
				else if (last == m)
					toggle = sendctl(last = toggle?h:m);
			break;
			case FLAG_SPIN:
				gpioPWM(h->ctl.gpio,1430);
				gpioPWM(m->ctl.gpio,1570);
			break;
			default: break;
			}
		if (p)
			{
			fprintf(stdout,"HOUR: p%3.0lf t%3.0lf s%4.1lf ctl%4d   MIN: p%3.0lf t%3.0lf s%4.1lf ctl%4d                \r",
				360.0*(h->fdb.value      - (double)LOWER_LIMIT)/(double)RANGE,
				360.0*(h->ctl.target_pos - (double)LOWER_LIMIT)/(double)RANGE,
				h->ctl.speed,
				h->ctl.speed_ctl,
				360.0*(m->fdb.value      - (double)LOWER_LIMIT)/(double)RANGE,
				360.0*(m->ctl.target_pos - (double)LOWER_LIMIT)/(double)RANGE,
				m->ctl.speed,
				m->ctl.speed_ctl);
			}
		}
	
	return 0;
	}
