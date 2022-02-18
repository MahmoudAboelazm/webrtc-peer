interface Options {
  initiator: boolean;
  stream?: MediaStream;
}

export class Peer {
  private options: Options = { initiator: true };
  private peer;
  private candidate!: RTCIceCandidate | null;
  private channel;
  constructor(opt: Options) {
    this.options = opt;
    const { stream, initiator } = this.options;

    this.peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });

    if (stream) {
      this.options.stream
        .getTracks()
        .forEach((track) => this.peer.addTrack(track, stream));
    }

    // For initiator peer
    if (initiator) {
      this.channel = this.peer.createDataChannel("dataChannel");
    }

    // For receiver peer
    if (!initiator) {
      this.peer.ondatachannel = (e) => {
        this.channel = e.channel;
      };
    }
  }

  onSignal(FnCallBack: (signal: string) => any) {
    try {
      if (this.options.initiator) {
        this.peer.createOffer().then((offer) => {
          this.peer.setLocalDescription(offer).then(() => {
            this.peer.onicecandidate = (e) => {
              if (!this.candidate) {
                this.candidate = e.candidate;
                const mySignal = {
                  sdp: this.peer.localDescription,
                  candidate: this.candidate,
                };
                FnCallBack(JSON.stringify(mySignal));
              }
            };
          });
        });
      }

      if (!this.options.initiator) {
        this.peer.createAnswer().then((answer) => {
          this.peer.setLocalDescription(answer).then(() => {
            this.peer.onicecandidate = (e) => {
              if (!this.candidate) {
                this.candidate = e.candidate;
                const mySignal = {
                  sdp: this.peer.localDescription,
                  candidate: this.candidate,
                };
                FnCallBack(JSON.stringify(mySignal));
              }
            };
          });
        });
      }
    } catch (error: any) {
      console.log("onSignal Error: ", error.message);
    }
  }

  async setSignal(signal: string) {
    try {
      const signalObj = await JSON.parse(signal);
      this.peer
        .setRemoteDescription(signalObj.sdp)
        .then(() =>
          this.peer.addIceCandidate(new RTCIceCandidate(signalObj.candidate)),
        );
    } catch (error: any) {
      console.log("setSignal Error: ", error.message);
    }
  }
  onStream(FnCallBack: (stream: MediaStream) => any) {
    this.peer.ontrack = (e) => FnCallBack(e.streams[0]);
  }

  onMessage(FnCallBack: (message: string) => any) {
    const checkIfthereIsChannel = setInterval(() => {
      if (this.channel) {
        this.channel.onmessage = (e) => FnCallBack(e.data);
        clearInterval(checkIfthereIsChannel);
      }
    }, 1000);
  }

  emitMute() {
    if (this.channel) this.channel.send("mute");
  }

  emitUnmute() {
    if (this.channel) this.channel.send("unmute");
  }
  close() {
    this.peer.close();
  }
}
