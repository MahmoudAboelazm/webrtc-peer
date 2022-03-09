interface Options {
  initiator: boolean;
  stream?: MediaStream;
}
interface OnEvent {
  [k: string]: Function[];
}
export class Peer {
  private options: Options = { initiator: true };
  private peer;
  private dataChannel;
  private candidate: RTCIceCandidate | null;
  private onEvent: OnEvent = {};
  constructor(opt: Options) {
    this.options = opt;

    this.peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });

    if (this.options.stream) {
      this.options.stream
        .getTracks()
        .forEach((track) => this.peer.addTrack(track, this.options.stream!));
    }

    // for initiator
    if (this.options.initiator) {
      this.dataChannel = this.peer.createDataChannel("dataChannel");
    }

    // for remote peer
    if (!this.options.initiator) {
      this.peer.ondatachannel = (e) => {
        this.dataChannel = e.channel;
      };
    }

    const checkIfthereIsChannel = setInterval(() => {
      if (this.dataChannel) {
        this.dataChannel.onmessage = (e) => {
          if (this.onEvent["onMessage"]) {
            const fnCallBacks = this.onEvent["onMessage"];
            fnCallBacks.map((fn) => fn(e.data));
          }

          if (this.onEvent[e.data]) {
            const fnCallBacks = this.onEvent[e.data];
            fnCallBacks.map((fn) => fn());
          }
        };
        clearInterval(checkIfthereIsChannel);
      }
    }, 1000);
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

  // to listen for all messages and events.
  onMessage(FnCallBack: (message: string) => any) {
    if (this.onEvent["onMessage"]) {
      this.onEvent["onMessage"].push(FnCallBack);
    } else {
      this.onEvent["onMessage"] = [FnCallBack];
    }
  }

  // to listen for a special event
  on(event: string, FnCallBack: () => any) {
    if (this.onEvent[event]) {
      this.onEvent[event].push(FnCallBack);
    } else {
      this.onEvent[event] = [FnCallBack];
    }
  }

  // to emit messages and events
  emit(msg: string) {
    if (this.dataChannel) this.dataChannel.send(msg);
  }

  close() {
    this.peer.close();
  }
}
