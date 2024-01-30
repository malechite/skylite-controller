#!/usr/bin/env node
const express = require('express');
const rpio = require('rpio');

const app = express();
const port = 80;

const RELAY_01 = 26;
const RELAY_02 = 20;
const RELAY_03 = 21;
const BUTTON_PRESS_DURATION = 100;
const BUTTON_PAUSE_DURATION = 50;
const BRIGHTNESS_DEBOUNCE = 500;
const POWER_ON = 'power_on';
const PULSE_MODE = 'pulse_mode';
const STARS_ONLY = 'stars_only';
const CLOUD_ONLY = 'cloud_only';
const POWER_OFF = 'power_off';
const BRIGHTNESS_LOW = 'brightness_low';
const BRIGHTNESS_NORMAL = 'brightness_normal';
const BRIGHTNESS_HIGH = 'brightness_high';

const modes = [
  POWER_OFF,
  POWER_ON,
  PULSE_MODE,
  STARS_ONLY,
  CLOUD_ONLY
]

const brightnessLevels = [
  BRIGHTNESS_HIGH,
  BRIGHTNESS_NORMAL,
  BRIGHTNESS_LOW
]

let powerButtonState = 0;
let rotation = false;
let brightness = 100;
let brightnessTimer;
let brightnessState = 0;

rpio.init({mapping: 'gpio'});

rpio.open(RELAY_01, rpio.OUTPUT, rpio.LOW);
rpio.open(RELAY_02, rpio.OUTPUT, rpio.LOW);
rpio.open(RELAY_03, rpio.OUTPUT, rpio.LOW);

const pushButton = (pin) => {
  rpio.write(pin, rpio.HIGH);
  rpio.msleep(BUTTON_PRESS_DURATION);
  rpio.write(pin, rpio.LOW);
  rpio.msleep(BUTTON_PAUSE_DURATION);
}

const pushPowerButton = () => {
  console.log('PUSH POWER BUTTON')
  pushButton(RELAY_01);
  if (powerButtonState < modes.length - 1) {
    powerButtonState++;
  } else {
    powerButtonState = 0;
  }
  console.log(powerButtonState, getState());
}

const pushBrightnessButton = () => {
  console.log('PUSH BRIGHTNESS BUTTON')
  pushButton(RELAY_03);
  if (brightnessState < brightnessLevels.length - 1) {
    brightnessState++;
  } else {
    brightnessState = 0;
  }
  console.log(brightnessState, brightnessLevels[brightnessState]);
}

const getState = () => modes[powerButtonState];

const getBrightness = () => brightnessLevels[brightnessState];

const getLightStatus = () => {
  switch (getState()) {
    case POWER_ON:
    case PULSE_MODE:
    case STARS_ONLY:
    case CLOUD_ONLY:
      return 1;
    case POWER_OFF:
      return 0;
  }
}

const powerOn = () => {
  console.log('POWER ON')
  if (getState() === POWER_OFF) {
    pushPowerButton();
    rotation = true;
  }
}

const powerOff = () => {
  console.log('POWER OFF')
  if (getState() !== POWER_OFF) {
    while (powerButtonState !== 0) {
      pushPowerButton();
    }
    rotation = false;
  }
}

const toggleRotation = () => {
  console.log('TOGGLE ROTATION')
  if (getState() !== POWER_OFF) {
    pushButton(RELAY_02);
    rotation = !rotation;
  }
}

const setBrightness = (value) => {
  if (brightnessTimer) {
    clearTimeout(brightnessTimer)
  }
  brightness = Number(value);
  brightnessTimer = setTimeout(() => {
    adjustBrightnessTo(value);
  }, BRIGHTNESS_DEBOUNCE)
}

const adjustBrightnessTo = (value) => {
  let targetBrightness;
  if (value < 33) {
    targetBrightness = BRIGHTNESS_LOW;
  } else if (value >= 33 && value < 66) {
    targetBrightness = BRIGHTNESS_NORMAL;
  } else if (value >= 66) {
    targetBrightness = BRIGHTNESS_HIGH;
  }

  while (getBrightness() !== targetBrightness) {
    pushBrightnessButton();
  }
}

app.get('/', (req, res) => {
  res.send('System Operational');
});

app.get('/POWER_ON', (req, res) => {
  powerOn();
  res.json(['Powering On!']);
})

app.get('/POWER_OFF', (req, res) => {
  powerOff();
  res.json(['Powering Off!']);
})

app.get('/STATUS', (req, res) => {
  res.json(getLightStatus());
})

app.get('/ROTATION_ON', (req, res) => {
  if (!rotation && getState() !== POWER_OFF) {
    toggleRotation();
  }
  res.json({"rotation": rotation});
})

app.get('/ROTATION_OFF', (req, res) => {
  if (rotation) {
    toggleRotation();
  }
  res.json({"rotation": rotation});
})

app.get('/ROTATION_STATUS', (req, res) => {
  res.json(rotation ? 1 : 0);
})

app.get('/BRIGHTNESS_STATUS', (req, res) => {
  res.json(brightness);
})

app.get('/BRIGHTNESS/:level', (req, res) => {
  const level = req.params.level;
  console.log('Brightness: ', level)
  setBrightness(level)
  res.json(brightness);
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`));