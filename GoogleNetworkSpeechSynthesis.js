// The MIT License (MIT)
//
// Copyright (c) 2015 Yuji Miyane
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// https://github.com/higuma/wav-audio-encoder-js
class WavAudioEncoder {
  constructor({ sampleRate, numberOfChannels }) {
    let controller;
    let readable = new ReadableStream({
      start(c) {
        return (controller = c);
      },
    });
    Object.assign(this, {
      sampleRate,
      numberOfChannels,
      numberOfSamples: 0,
      dataViews: [],
      controller,
      readable,
    });
  }
  write(buffer) {
    const floats = new Float32Array(buffer);
    let channels;
    // Deinterleave
    if (this.numberOfChannels > 1) {
      channels = [[], []];
      for (let i = 0, j = 0, n = 1; i < floats.length; i++) {
        channels[(n = ++n % 2)][!n ? j++ : j - 1] = floats[i];
      }
      channels = channels.map((f) => new Float32Array(f));
    } else {
      channels = [floats];
    }
    const [{ length }] = channels;
    const ab = new ArrayBuffer(length * this.numberOfChannels * 2);
    const data = new DataView(ab);
    let offset = 0;
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < this.numberOfChannels; ch++) {
        let x = channels[ch][i] * 0x7fff;
        data.setInt16(
          offset,
          x < 0 ? Math.max(x, -0x8000) : Math.min(x, 0x7fff),
          true
        );
        offset += 2;
      }
    }
    this.controller.enqueue(new Uint8Array(ab));
    this.numberOfSamples += length;
  }
  setString(view, offset, str) {
    const len = str.length;
    for (let i = 0; i < len; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
  async encode() {
    const dataSize = this.numberOfChannels * this.numberOfSamples * 2;
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    this.setString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.setString(view, 8, 'WAVE');
    this.setString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, this.numberOfChannels, true);
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate * 4, true);
    view.setUint16(32, this.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    this.setString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    this.controller.close();
    return new Blob(
      [
        buffer,
        await new Response(this.readable, {
          cache: 'no-store',
        }).arrayBuffer(),
      ],
      {
        type: 'this.audio/wav',
      }
    );
  }
}

// Copyright 2015 The Chromium Authors. All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//    * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//    * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//    * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

class GoogleNetworkSpeechSynthesis {
  constructor({
    key = '', // Bring your own Google API key
    input = 'Google Network Speech Synthesis',
    inputType = 'ssml',
    playbackType = 'wav',
    lang = 'en-US',
    gender = 'male',
  } = {}) {
    // https://source.chromium.org/chromium/chromium/src/+/master:chrome/browser/resources/network_speech_synthesis/tts_extension.js;drc=6c876d3d1412212cd4a671f54aacd9277f985ff2;l=122
    // Truncate the utterance if it's too long. Both Chrome's tts
    // extension api and the web speech api specify 32k as the
    // maximum limit for an utterance.
    //    if (utterance.length > 32768) {
    //      utterance = utterance.substr(0, 32768);
    //    }
    console.log(input.length);
    if (input.length > 32768) {
      throw new Error(`Utterance length greater than 32768, see https://source.chromium.org/chromium/chromium/src/+/master:chrome/browser/resources/network_speech_synthesis/tts_extension.js;l=122-127\n
     `);
    }
    Object.assign(this, {
      input,
      inputType,
      playbackType,
      lang,
      gender,
    });
    this.proxy = ''; // Bring your own proxy
    // https://source.chromium.org/chromium/chromium/src/+/master:chrome/browser/resources/network_speech_synthesis/tts_extension.js
    this.url = 'https://www.google.com/speech-api/v2/synthesize?';
    this.params = new URLSearchParams();
    this.params.append('enc', 'mpeg');
    this.params.append('client', 'chromium');
    this.params.append('key', key);
    this.params.append(this.inputType, this.input);
    this.params.append('lang', this.lang);
    this.params.append('gender', this.gender);
  }
  async speak() {
    return this.fetch()
      .then((ab) => this.audioData(ab))
      .then((channelData) =>
        this.playbackType === 'wav'
          ? this.wav(channelData)
          : this.playbackType === 'stream' && this.stream(channelData)
      )
      .catch((err) => {
        throw err;
      });
  }
  async fetch() {
    try {
      const request = await fetch(
        this.proxy + this.url + this.params.toString()
      );
      const response = await request.arrayBuffer();
      return response;
    } catch (error) {
      throw err;
    }
  }
  async audioData(ab) {
    try {
      this.ac = new AudioContext({
        sampleRate: 22050,
      });
      let buffer = await this.ac.decodeAudioData(ab);
      let channelData = buffer.getChannelData(0);
      return channelData;
    } catch (err) {
      throw err;
    }
  }
  async wav(channelData) {
    // Converts MPEG to WAV, appends new <audio> element for each instance
    try {
      const wav = new WavAudioEncoder({
        numberOfChannels: 1,
        sampleRate: 22050,
      });
      wav.write(channelData.buffer);
      const file = await wav.encode();
      this.audio = document.createElement('video');
      this.audio.className = 'google_network_speech_synthesis';
      this.audio.controls = this.audio.autoplay = true;
      this.audio.height = '75';
      this.audio.width = '300';
      this.audio.style.position = 'absolute';
      this.audio.style.display = 'flex';
      this.audio.style.padding = this.audio.style.margin = 'none';
      this.audio.style.border = 'none';
      this.audio.style.outline = 'none';
      this.audio.style.lineHeight = '1px';
      let calc = `calc(${
        document.querySelectorAll('.google_network_speech_synthesis').length *
        62.5
      }px)`;
      this.audio.style.top = calc;
      this.audio.style.zIndex = 100;
      document.body.appendChild(this.audio);
      this.audio.src = URL.createObjectURL(file);
      return `Google Network Speech Synthesis type: ${this.playbackType}`;
    } catch (err) {
      throw err;
    }
  }
  async stream(channelData) {
    // Live streams and replaces current live stream with each instance
    let msd = new MediaStreamAudioDestinationNode(this.ac, {
      channelCount: 1,
    });
    let osc = new OscillatorNode(this.ac, {
      frquency: 0,
    });
    osc.connect(msd);
    let generator = new MediaStreamTrackGenerator({
      kind: 'audio',
    });
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = 'brown';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Google Network Speech Synthesis',
      canvas.width / 2,
      canvas.height / 2
    );
    let [videoTrack] = canvas.captureStream().getVideoTracks();
    let mediaStream = new MediaStream([generator, videoTrack]);
    let processor = new MediaStreamTrackProcessor({
      track: msd.stream.getAudioTracks()[0],
    });
    let i = 0;
    if (!document.pictureInPictureElement) {
      this.audio = document.createElement('video');
      this.audio.id = 'google_network_speech_synthesis';
      this.audio.controls = this.audio.autoplay = true;
      this.audio.style.position = 'absolute';
      this.audio.style.display = 'block';
      this.audio.style.top = 0;
    } else {
      this.audio = document.pictureInPictureElement;
      this.audio.srcObject.getTracks().forEach((t) => t.stop());
      this.audio.load();
      this.audio.srcObject = null;
    }
    this.audio.onloadedmetadata = async () => {
      try {
        await this.audio.requestPictureInPicture();
      } catch (e) {
        console.error(e);
      }
    };
    this.audio.srcObject = mediaStream;

    await processor.readable
      .pipeThrough(
        new TransformStream({
          transform(
            {
              format,
              timestamp,
              duration,
              numberOfChannels,
              numberOfFrames,
              sampleRate,
            },
            controller
          ) {
            if (i < channelData.length) {
              let data = new Float32Array(numberOfFrames);
              data.set(channelData.subarray(i, (i += 220)));
              const ad = new AudioData({
                format,
                duration,
                numberOfChannels,
                numberOfFrames,
                sampleRate,
                timestamp,
                data,
              });
              controller.enqueue(ad);
            } else {
              controller.terminate();
            }
          },
        })
      )
      .pipeTo(generator.writable);
    //console.log(msd.stream.getAudioTracks()[0].readyState, ac.state);
    msd.stream.getAudioTracks()[0].stop();
    await this.ac.close();
    await document.exitPictureInPicture();
    return `Google Network Speech Synthesis type: ${this.playbackType}`;
    //console.log(msd.stream.getAudioTracks()[0].readyState, ac.state);
  }
  removeAudioElements() {
    document
      .querySelectorAll('.google_network_speech_synthesis')
      .forEach((element) => {
        element.remove();
      });
  }
  static async getGoogleApiKey() {
    // Get Google API key by any means
    // chrome.systemPrivate.getApiKey((key) => console.log(key));
    // https://www.reddit.com/r/chrome/comments/x6ivcb/where_is_chromesystemprivategetapikey_documented/
    try {
      if (!globalThis[Symbol.for('GOOGLE_API_KEY')]) {
        let [handle] = await showOpenFilePicker({
          startIn: 'downloads',
        });
        globalThis[Symbol.for('GOOGLE_API_KEY')] = await (
          await handle.getFile()
        ).text();
      }
      return globalThis[Symbol.for('GOOGLE_API_KEY')];
    } catch (err) {
      throw err;
    }
  }
}
