interface Options {
  initiator: boolean;
  stream?: MediaStream;
}
interface OnEvent {
  [k: string]: Function[];
}
export class Peer {
  private options: Options = { initiator: true };
  private peer: RTCPeerConnection;
  private dataChannel: RTCDataChannel | undefined;
  private candidates: RTCIceCandidate[] = [];
  private onEvent: OnEvent = {};
  constructor(opt: Options) {
    this.options = opt;

    this.peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
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
  getIceCandidates(signalCallBack: (signal: string) => any) {
    this.peer.onicecandidate = (e) => {
      if (e.candidate === null) {
        const mySignal = {
          sdp: this.peer.localDescription,
          candidates: this.candidates,
        };
        signalCallBack(JSON.stringify(mySignal));
        return;
      }

      this.candidates.push(e.candidate);
    };
  }
  onSignal(fnCallBack: (signal: string) => any) {
    try {
      if (this.options.initiator) {
        this.peer.createOffer().then((offer) => {
          this.peer
            .setLocalDescription(offer)
            .then(() => this.getIceCandidates(fnCallBack));
        });
      }

      if (!this.options.initiator) {
        this.peer.createAnswer().then((answer) => {
          this.peer
            .setLocalDescription(answer)
            .then(() => this.getIceCandidates(fnCallBack));
        });
      }
    } catch (error: any) {
      console.log("onSignal Error: ", error.message);
    }
  }

  async setSignal(signal: string) {
    try {
      const signalObj: {
        sdp: RTCSessionDescription;
        candidates: RTCIceCandidate[];
      } = await JSON.parse(signal);

      this.peer.setRemoteDescription(signalObj.sdp).then(() => {
        signalObj.candidates.forEach((c) => {
          this.peer.addIceCandidate(new RTCIceCandidate(c));
        });
      });
    } catch (error: any) {
      console.log("setSignal Error: ", error.message);
    }
  }
  onStream(fnCallBack: (stream: MediaStream) => any) {
    this.peer.ontrack = (e) => fnCallBack(e.streams[0]);
  }

  // to listen for all messages and events.
  onMessage(fnCallBack: (message: string) => any) {
    if (this.onEvent["onMessage"]) {
      this.onEvent["onMessage"].push(fnCallBack);
    } else {
      this.onEvent["onMessage"] = [fnCallBack];
    }
  }

  // to listen for a special event
  on(event: string, fnCallBack: () => any) {
    if (this.onEvent[event]) {
      this.onEvent[event].push(fnCallBack);
    } else {
      this.onEvent[event] = [fnCallBack];
    }
  }

  // to emit messages and events
  emit(msg: string) {
    if (this.dataChannel) {
      if (this.dataChannel.readyState === "open") this.dataChannel.send(msg);
    }
  }

  close() {
    this.peer.close();
  }
}
