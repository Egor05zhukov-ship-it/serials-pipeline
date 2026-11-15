// Procedural sound made with ffmpeg only: a dark ambient bed and one accent.
// Nothing is downloaded, so there is nothing to license.

// quiet A-minor drone with slow beating; partials sit above 110 Hz so phone speakers reproduce it
export const bedArgs = (dur) => {
  const e = [
    '0.22*sin(2*PI*110*t)*(0.65+0.35*sin(2*PI*0.07*t))',
    '0.16*sin(2*PI*164.8*t)*(0.55+0.45*sin(2*PI*0.05*t+1))',
    '0.12*sin(2*PI*220.6*t)*(0.5+0.5*sin(2*PI*0.09*t+2))',
    '0.07*sin(2*PI*261.6*t)*(0.5+0.5*sin(2*PI*0.04*t+4))',
    '0.03*sin(2*PI*659.3*t+2*sin(2*PI*0.2*t))*(0.4+0.6*sin(2*PI*0.06*t+3))',
  ].join('+');
  return ['-f', 'lavfi', '-i', `aevalsrc='${e}':d=${dur}:s=48000`, '-f', 'lavfi', '-i', `anoisesrc=color=brown:amplitude=0.25:d=${dur}:r=48000`,
    '-filter_complex', `[1]lowpass=f=420,highpass=f=90[n];[0][n]amix=inputs=2:normalize=0,aecho=0.8:0.6:180|430:0.35|0.25,lowpass=f=2400,afade=t=in:d=0.25,afade=t=out:st=${Math.max(0, dur - 1.5)}:d=1.5`];
};

// Low drum-like hit for a final line: a burst of low noise over a decaying 52 Hz tone.
// (An audio tagger hears it as a timpani hit. A knock built the same way did not read as a knock,
// so knocks, doors and other concrete sounds should come from real recordings, not from code.)
export const hitSrc = () => `anoisesrc=color=brown:d=3:amplitude=1:r=48000,lowpass=f=220,volume='3*exp(-5*t)':eval=frame[n];aevalsrc='(0.9*sin(2*PI*52*t)+0.5*sin(2*PI*104*t))*exp(-2.2*t)':d=3:s=48000[s];[n][s]amix=inputs=2:normalize=0,aecho=0.8:0.6:210:0.3[out0]`;

export const SFX = { hit: hitSrc };
