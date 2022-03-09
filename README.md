# WebRTC Peer

Basic setup for peer-to-peer connection between two browsers, supporting both
data channels and media streams.

## Setup

Make a clone of the repo for your project.

## Usage

There are two setups one for the initiator peer and the other for the remote
peer.

### Initiator

```typescript
const config = { initiator: true, stream };
const peer = new Peer(config);
peer.onSignal((signal) => {
  console.log(signal);
  // Send your signal to the remote peer by somehow
});
```

When the remote peer sends his signal back you should update your signal.

```typescript
peer.setSignal(signal);
```

### Remote

```typescript
const config = { initiator: false, stream };
const peer = new Peer(config);
await peer.setSignal(initiatorSignal);
peer.onSignal((signal) => {
  console.log(signal);
  // Send your signal to the initiator peer by somehow
});
```

### How to get the stream?

```typescript
peer.onStream((stream) => {
  console.log(stream);
  // Render the stream in video or audio HTML element
});
```

### Messages & Events

```typescript
// For emitting messages and events
peer.emit("Event-or-Msg");

// To listen for all messages and events.
peer.onMessage((msg) => {
  console.log(msg);
});

// To listen for a special event
peer.on("event", () => {
  // Do something here
});
```
