GoogleNetworkSpeechSynthesis.getGoogleApiKey()
  .then(async (key) => {
    // console.log(key);
    const gnss0 = new GoogleNetworkSpeechSynthesis({
      key,
      input: `<?xml version="1.0"?>
  <speak version="1.1"
       xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="http://www.w3.org/2001/10/synthesis http://www.w3.org/TR/speech-synthesis11/synthesis.xsd"
       xml:lang="en-US">
       <p>A paragraph.</p><p>Another paragraph</p>
       This is a <break time="2500ms"/> 2.5 second pause.
       <prosody pitch="0.5" contour="" range="" rate="0.25" duration="" volume="">PI</prosody><break time="1s"/>
       <prosody pitch="x-low" contour="" range="" rate="medium" duration="" volume="">The number e</prosody><break strength="strong"/>
              Digits <say-as interpret-as="digits">123</say-as> <break/>
       Cardinal <say-as interpret-as="cardinal">123</say-as> <break/>
       Ordinal <say-as interpret-as="ordinal">123</say-as> <break/>
       Characters <say-as interpret-as="characters">SSML</say-as>
       Date format <say-as interpret-as="characters">mdy</say-as> <say-as interpret-as="date" format="mdy">2/13/2018</say-as> <break/>
       Time format <say-as interpret-as="characters">hms</say-as> 24 <say-as interpret-as="time" format="hms24">${new Date().toLocaleTimeString()}</say-as> <break/>
       Time format <say-as interpret-as="characters">hms</say-as> 12 <say-as interpret-as="time" format="hms12">${new Date()
         .toLocaleTimeString()
         .replace(/[^\d:]/g, '')}</say-as>
  </speak>`,
      inputType: 'ssml',
      playbackType: 'wav',
    });

    const gnss1 = new GoogleNetworkSpeechSynthesis({
      key,
      input: `Now watch..., this' how science works.
One researcher comes up with a result.
And that is not the truth. No, no.
A scientific emergent truth is not the
result of one experiment. What has to
happen is somebody else has to verify
it. Preferably a competitor. Preferably
someone who doesn't want you to be correct.

- Neil deGrasse Tyson, May 3, 2017 at 92nd Street Y`,
      inputType: 'text',
      playbackType: 'stream',
      gender: 'female',
    });

    Promise.all([gnss0.speak(), gnss1.speak()]).then((streams) => {
      for (const tts of streams) {
        console.log(tts);
      }
      gnss1.removeAudioElements();
    }, console.error);
  
    // Should throw for input.length > 32768
    try {
      const gnss1 = new GoogleNetworkSpeechSynthesis({
        key,
        input: '1'.repeat(32768 + 1),
        inputType: 'text',
        playbackType: 'stream',
        gender: 'female',
      });
      await gnss1.speak();
    } catch (e) {
      console.error(e);
    }
  })
  .catch(console.error);
