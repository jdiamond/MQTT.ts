import { QoS } from "../lib/mod.ts";
import {
  AnyPacket,
  AnyPacketWithLength,
  ConnackPacket,
  decode,
  encode,
  PubackPacket,
  PubcompPacket,
  PublishPacket,
  PubrecPacket,
  PubrelPacket,
  SubackPacket,
  SubscribePacket,
  UnsubackPacket,
  UnsubscribePacket,
} from "../packets/mod.ts";
import { UTF8Decoder, UTF8Encoder } from "../packets/utf8.ts";

type URLFactory = URL | string | (() => URL | string | void);
type ClientIdFactory = string | (() => string);

export type ClientOptions = {
  url?: URLFactory;
  clientId?: ClientIdFactory;
  clientIdPrefix?: string;
  clean?: boolean;
  keepAlive?: number;
  username?: string;
  password?: string;
  connectTimeout?: number;
  connect?: boolean | RetryOptions;
  reconnect?: boolean | RetryOptions;
  incomingStore?: IncomingStore;
  outgoingStore?: OutgoingStore;
  logger?: (msg: string, ...args: unknown[]) => void;
};

export type RetryOptions = {
  retries?: number;
  minDelay?: number;
  maxDelay?: number;
  factor?: number;
  random?: boolean;
};

export type PublishOptions = {
  dup?: boolean;
  qos?: QoS;
  retain?: boolean;
};

export type SubscriptionOption = {
  topicFilter: string;
  qos?: QoS;
};

export type Subscription = {
  topicFilter: string;
  qos: QoS;
  state:
    | "unknown"
    | "pending"
    | "removed"
    | "replaced"
    | "unacknowledged"
    | "acknowledged"
    | "unsubscribe-pending"
    | "unsubscribe-unacknowledged"
    | "unsubscribe-acknowledged";
  returnCode?: number;
};

type ConnectionStates =
  | "offline"
  | "connecting"
  | "connected"
  | "disconnecting"
  | "disconnected";

const packetIdLimit = 2 ** 16;

// Only used for incoming QoS 2 messages.
export abstract class IncomingStore {
  // On receiving a PublishPacket with QoS 2 and the dup flag set to false,
  // store the packet identifier and deliver the message to the application.
  abstract store(packetId: number): Promise<void>;

  // On receiving a PublishPacket with QoS 2 and the dup flag set to true, if
  // the store still has the packet identifier, don't resend it to the
  // application.
  abstract has(packetId: number): Promise<boolean>;

  // After receiving a PubrelPacket, discared the packet identifier.
  abstract discard(packetId: number): Promise<void>;
}

export class IncomingMemoryStore extends IncomingStore {
  packets = new Set<number>();

  store(packetId: number) {
    this.packets.add(packetId);

    return Promise.resolve();
  }

  has(packetId: number) {
    return Promise.resolve(this.packets.has(packetId));
  }

  discard(packetId: number) {
    this.packets.delete(packetId);

    return Promise.resolve();
  }
}

// Used for outgoing QoS 1 and 2 messages.
export abstract class OutgoingStore {
  // Store a PublishPacket so it can be resent if the connection is lost. In QoS
  // 2, storing a PubrelPacket (after receiving a PubrecPacket) marks the
  // original PublishPacket as received so it can be discarded and replaced with
  // the PubrelPacket.
  abstract store(packet: PublishPacket | PubrelPacket): Promise<void>;

  // Discard the PublishPacket or PubrelPacket associated with this packet
  // identifier. For QoS 1, this gets called after receiveng a PubackPacket. For
  // QoS 2, this gets called after receiving a PubcompPacket.
  abstract discard(packetId: number): Promise<void>;

  // Used on reconnecting to resend publish and pubrel packets. Packets are
  // supposed to be resent in the order they were stored.
  abstract iterate(): AsyncIterable<PublishPacket | PubrelPacket>;
}

export class OutgoingMemoryStore extends OutgoingStore {
  packets = new Map<number, PublishPacket | PubrelPacket>();

  store(packet: PublishPacket | PubrelPacket) {
    if (!packet.id) {
      return Promise.reject(new Error("missing packet.id"));
    }

    this.packets.set(packet.id, packet);

    return Promise.resolve();
  }

  discard(packetId: number) {
    this.packets.delete(packetId);

    return Promise.resolve();
  }

  async *iterate(): AsyncIterable<PublishPacket | PubrelPacket> {
    for (const value of this.packets.values()) {
      yield value;
    }
  }
}

const defaultPorts: { [protocol: string]: number } = {
  mqtt: 1883,
  mqtts: 8883,
  ws: 80,
  wss: 443,
};

const defaultClientIdPrefix = "mqttts";
const defaultKeepAlive = 60;
const defaultConnectTimeout = 10 * 1000;
const defaultConnectOptions = {
  retries: Infinity,
  minDelay: 1000,
  maxDelay: 2000,
  factor: 1.1,
  random: false,
};
const defaultReconnectOptions = {
  retries: Infinity,
  minDelay: 1000,
  maxDelay: 60000,
  factor: 1.1,
  random: true,
};

// deno-lint-ignore no-explicit-any
export type ClientEventListener = (...args: any[]) => void;

export abstract class Client {
  options: ClientOptions;
  url?: URL;
  clientId: string;
  keepAlive: number;
  connectionState: ConnectionStates = "offline";
  everConnected = false;
  disconnectRequested = false;
  reconnectAttempt = 0;
  subscriptions: Subscription[] = [];

  private lastPacketId = 0;
  private lastPacketTime: Date | undefined;

  private buffer: Uint8Array | null = null;

  private unresolvedConnect?: Deferred<ConnackPacket>;

  private queuedPublishes: {
    packet: PublishPacket;
    deferred: Deferred<void>;
  }[] = [];

  private unresolvedPublishes = new Map<number, Deferred<void>>();

  private incomingStore: IncomingStore;
  private outgoingStore: OutgoingStore;

  private unresolvedSubscribes = new Map<
    string,
    Deferred<SubackPacket | null>
  >();

  private unresolvedUnsubscribes = new Map<
    string,
    Deferred<UnsubackPacket | null>
  >();

  private unacknowledgedSubscribes = new Map<
    number,
    {
      subscriptions: Subscription[];
    }
  >();

  private unacknowledgedUnsubscribes = new Map<
    number,
    {
      subscriptions: Subscription[];
    }
  >();

  private eventListeners: Map<string, ((...args: unknown[]) => void)[]> =
    new Map();

  private timers: {
    [key: string]: number | undefined;
  } = {};

  protected log: (msg: string, ...args: unknown[]) => void;

  public constructor(options?: ClientOptions) {
    this.options = options || {};
    this.clientId = this.generateClientId();
    this.keepAlive = typeof this.options.keepAlive === "number"
      ? this.options.keepAlive
      : defaultKeepAlive;

    this.incomingStore = this.options.incomingStore ||
      new IncomingMemoryStore();
    this.outgoingStore = this.options.outgoingStore ||
      new OutgoingMemoryStore();

    this.log = this.options.logger || (() => {});
  }

  public connect(): Promise<ConnackPacket> {
    switch (this.connectionState) {
      case "offline":
      case "disconnected":
        break;
      default:
        return Promise.reject(
          new Error(
            `should not be connecting in ${this.connectionState} state`,
          ),
        );
    }

    this.disconnectRequested = false;

    const deferred = new Deferred<ConnackPacket>();

    this.unresolvedConnect = deferred;

    this.openConnection();

    return deferred.promise;
  }

  public publish(
    topic: string,
    // deno-lint-ignore no-explicit-any
    payload: any,
    options?: PublishOptions,
  ): Promise<void> {
    const dup = (options && options.dup) || false;
    const qos = (options && options.qos) || 0;
    const retain = (options && options.retain) || false;
    const id = qos > 0 ? this.nextPacketId() : 0;

    const packet: PublishPacket = {
      type: "publish",
      dup,
      qos,
      retain,
      topic,
      payload,
      id,
    };

    const deferred = new Deferred<void>();

    if (this.connectionState === "connected") {
      this.sendPublish(packet, deferred);
    } else {
      this.log("queueing publish");

      this.queuedPublishes.push({ packet, deferred });
    }

    return deferred.promise;
  }

  protected async flushQueuedPublishes() {
    let queued;

    while ((queued = this.queuedPublishes.shift())) {
      const { packet, deferred } = queued;

      await this.sendPublish(packet, deferred);
    }
  }

  protected async flushUnacknowledgedPublishes() {
    for await (const packet of this.outgoingStore.iterate()) {
      if (packet.type === "publish") {
        await this.send({ ...packet, dup: true });
      } else {
        await this.send(packet);
      }
    }
  }

  protected async sendPublish(packet: PublishPacket, deferred: Deferred<void>) {
    if (packet.qos && packet.qos > 0) {
      this.unresolvedPublishes.set(packet.id!, deferred);
      this.outgoingStore.store(packet);
    }

    await this.send(packet);

    if (!packet.qos) {
      deferred.resolve();
    }
  }

  public async subscribe(
    topicFilter: string,
    qos?: QoS,
  ): Promise<Subscription[]>;

  public async subscribe(
    topicFilters: string[],
    qos?: QoS,
  ): Promise<Subscription[]>;

  public async subscribe(
    subscription: SubscriptionOption,
    qos?: QoS,
  ): Promise<Subscription[]>;

  public async subscribe(
    subscriptions: SubscriptionOption[],
    qos?: QoS,
  ): Promise<Subscription[]>;

  public async subscribe(
    input: SubscriptionOption | string | (SubscriptionOption | string)[],
    qos?: QoS,
  ): Promise<Subscription[]> {
    switch (this.connectionState) {
      case "disconnecting":
      case "disconnected":
        throw new Error(
          `should not be subscribing in ${this.connectionState} state`,
        );
    }

    const arr = Array.isArray(input) ? input : [input];
    const subs = arr.map<Subscription>((sub) => {
      return typeof sub === "object"
        ? {
          topicFilter: sub.topicFilter,
          qos: sub.qos || qos || 0,
          state: "pending",
        }
        : { topicFilter: sub, qos: qos || 0, state: "pending" };
    });
    const promises = [];

    for (const sub of subs) {
      // Replace any matching subscription so we don't resubscribe to it
      // multiple times on reconnect. This matches what the broker is supposed
      // to do when it receives a subscribe packet containing a topic filter
      // matching an existing subscription.
      this.subscriptions = this.subscriptions.filter(
        (old) => old.topicFilter !== sub.topicFilter,
      );

      this.subscriptions.push(sub);

      const deferred = new Deferred<SubackPacket | null>();

      this.unresolvedSubscribes.set(sub.topicFilter, deferred);

      promises.push(deferred.promise.then(() => sub));
    }

    await this.flushSubscriptions();

    return Promise.all(promises);
  }

  protected async flushSubscriptions() {
    const subs = this.subscriptions.filter((sub) => sub.state === "pending");

    if (subs.length > 0 && this.connectionState === "connected") {
      await this.sendSubscribe(subs);
    }
  }

  private async sendSubscribe(subscriptions: Subscription[]) {
    const subscribePacket: SubscribePacket = {
      type: "subscribe",
      id: this.nextPacketId(),
      subscriptions: subscriptions.map((sub) => ({
        topicFilter: sub.topicFilter,
        qos: sub.qos,
      })),
    };

    this.unacknowledgedSubscribes.set(subscribePacket.id, {
      subscriptions,
    });

    await this.send(subscribePacket);

    for (const sub of subscriptions) {
      sub.state = "unacknowledged";
    }
  }

  public async unsubscribe(topicFilter: string): Promise<Subscription[]>;

  public async unsubscribe(topicFilters: string[]): Promise<Subscription[]>;

  public async unsubscribe(input: string | string[]): Promise<Subscription[]> {
    switch (this.connectionState) {
      case "disconnecting":
      case "disconnected":
        throw new Error(
          `should not be unsubscribing in ${this.connectionState} state`,
        );
    }

    const arr = Array.isArray(input) ? input : [input];
    const promises = [];

    for (const topicFilter of arr) {
      const sub = this.subscriptions.find(
        (sub) => sub.topicFilter === topicFilter,
      ) || { topicFilter, qos: 0, state: "unknown" };
      const deferred = new Deferred<UnsubackPacket | null>();
      const promise = deferred.promise.then(() => sub);

      if (
        this.connectionState !== "connected" &&
        this.options.clean !== false
      ) {
        sub.state = "removed";
      } else {
        switch (sub.state) {
          case "pending":
            sub.state = "removed";
            break;
          case "removed":
          case "replaced":
            // Subscriptions with these states should have already been removed.
            break;
          case "unknown":
          case "unacknowledged":
          case "acknowledged":
            sub.state = "unsubscribe-pending";
            break;
          case "unsubscribe-pending":
          case "unsubscribe-unacknowledged":
          case "unsubscribe-acknowledged":
            // Why is this happening?
            break;
        }
      }

      this.unresolvedUnsubscribes.set(topicFilter, deferred);

      promises.push(promise);
    }

    await this.flushUnsubscriptions();

    return Promise.all(promises);
  }

  protected async flushUnsubscriptions() {
    const subs = [];

    for (const sub of this.subscriptions) {
      if (sub.state === "removed") {
        const unresolvedSubscribe = this.unresolvedSubscribes.get(
          sub.topicFilter,
        );

        if (unresolvedSubscribe) {
          this.unresolvedSubscribes.delete(sub.topicFilter);

          unresolvedSubscribe.resolve(null);
        }

        const unresolvedUnsubscribe = this.unresolvedUnsubscribes.get(
          sub.topicFilter,
        );

        if (unresolvedUnsubscribe) {
          this.unresolvedUnsubscribes.delete(sub.topicFilter);

          unresolvedUnsubscribe.resolve(null);
        }
      }

      if (sub.state === "unsubscribe-pending") {
        subs.push(sub);
      }
    }

    this.subscriptions = this.subscriptions.filter(
      (sub) => sub.state !== "removed",
    );

    if (subs.length > 0 && this.connectionState === "connected") {
      await this.sendUnsubscribe(subs);
    }
  }

  private async sendUnsubscribe(subscriptions: Subscription[]) {
    const unsubscribePacket: UnsubscribePacket = {
      type: "unsubscribe",
      id: this.nextPacketId(),
      topicFilters: subscriptions.map((sub) => sub.topicFilter),
    };

    this.unacknowledgedUnsubscribes.set(unsubscribePacket.id, {
      subscriptions,
    });

    await this.send(unsubscribePacket);

    for (const sub of subscriptions) {
      sub.state = "unsubscribe-unacknowledged";
    }
  }

  public async disconnect(): Promise<void> {
    switch (this.connectionState) {
      case "connected":
        await this.doDisconnect();
        break;
      case "connecting":
        this.disconnectRequested = true;
        break;
      case "offline":
        this.changeState("disconnected");
        this.stopTimers();
        break;
      default:
        throw new Error(
          `should not be disconnecting in ${this.connectionState} state`,
        );
    }
  }

  private async doDisconnect() {
    this.changeState("disconnecting");
    this.stopTimers();
    await this.send({ type: "disconnect" });
    await this.close();
  }

  // Methods implemented by subclasses

  protected abstract getDefaultURL(): URL | string;

  protected abstract validateURL(url: URL): void;

  protected abstract open(url: URL): Promise<void>;

  protected abstract write(bytes: Uint8Array): Promise<void>;

  protected abstract close(): Promise<void>;

  protected encode(packet: AnyPacket, utf8Encoder?: UTF8Encoder): Uint8Array {
    return encode(packet, utf8Encoder);
  }

  protected decode(
    bytes: Uint8Array,
    utf8Decoder?: UTF8Decoder,
  ): AnyPacketWithLength | null {
    return decode(bytes, utf8Decoder);
  }

  // This gets called from connect and when reconnecting.
  protected async openConnection() {
    try {
      this.changeState("connecting");

      this.url = this.getURL();

      this.log(`opening connection to ${this.url}`);

      await this.open(this.url);

      await this.send({
        type: "connect",
        clientId: this.clientId,
        username: this.options.username,
        password: this.options.password,
        clean: this.options.clean !== false,
        keepAlive: this.keepAlive,
      });

      this.startConnectTimer();
    } catch (err) {
      this.log(`caught error opening connection: ${err.message}`);

      this.changeState("offline");

      if (!this.startReconnectTimer()) {
        this.notifyConnectRejected(new Error("connection failed"));
      }
    }
  }

  // This gets called when the connection is fully established (after receiving the CONNACK packet).
  protected async connectionEstablished(connackPacket: ConnackPacket) {
    if (this.options.clean !== false || !connackPacket.sessionPresent) {
      for (const sub of this.subscriptions) {
        if (sub.state === "unsubscribe-pending") {
          sub.state = "removed";
        } else {
          sub.state = "pending";
        }
      }
    }

    await this.flushSubscriptions();
    await this.flushUnsubscriptions();
    await this.flushUnacknowledgedPublishes();
    await this.flushQueuedPublishes();

    if (this.unresolvedConnect) {
      this.log("resolving initial connect");

      this.unresolvedConnect.resolve(connackPacket);
    }

    if (this.disconnectRequested) {
      this.doDisconnect();
    } else {
      this.startKeepAliveTimer();
    }
  }

  // This gets called by subclasses when the connection is unexpectedly closed.
  protected connectionClosed() {
    this.log("connectionClosed");

    switch (this.connectionState) {
      case "disconnecting":
        this.changeState("disconnected");
        break;
      default:
        this.changeState("offline");
        this.reconnectAttempt = 0;
        this.startReconnectTimer();
        break;
    }

    this.stopKeepAliveTimer();
  }

  protected connectionError(error: Error) {
    // TODO: decide what to do with this
    this.log("connectionError", error);
  }

  protected bytesReceived(bytes: Uint8Array) {
    this.log("bytes received", bytes);

    this.emit("bytesreceived", bytes);

    let buffer: Uint8Array | null = bytes;

    const oldBuffer = this.buffer;

    if (oldBuffer) {
      const newBuffer = new Uint8Array(oldBuffer.length + bytes.length);

      newBuffer.set(oldBuffer);
      newBuffer.set(bytes, oldBuffer.length);

      buffer = newBuffer;
    } else {
      buffer = bytes;
    }

    do {
      const packet = this.decode(buffer);

      if (!packet) {
        break;
      }

      this.log(`received ${packet.type} packet`, packet);

      this.packetReceived(packet);

      if (packet.length < buffer.length) {
        buffer = buffer.slice(packet.length);
      } else {
        buffer = null;
      }
    } while (buffer);

    this.buffer = buffer;
  }

  protected packetReceived(packet: AnyPacket) {
    this.emit("packetreceive", packet);

    switch (packet.type) {
      case "connack":
        this.handleConnack(packet);
        break;
      case "publish":
        this.handlePublish(packet);
        break;
      case "puback":
        this.handlePuback(packet);
        break;
      case "pubrec":
        this.handlePubrec(packet);
        break;
      case "pubrel":
        this.handlePubrel(packet);
        break;
      case "pubcomp":
        this.handlePubcomp(packet);
        break;
      case "suback":
        this.handleSuback(packet);
        break;
      case "unsuback":
        this.handleUnsuback(packet);
        break;
    }
  }

  protected protocolViolation(msg: string) {
    this.log("protocolViolation", msg);
  }

  protected handleConnack(packet: ConnackPacket) {
    switch (this.connectionState) {
      case "connecting":
        break;
      default:
        throw new Error(
          `should not be receiving connack packets in ${this.connectionState} state`,
        );
    }

    this.changeState("connected");

    this.everConnected = true;

    this.stopConnectTimer();

    this.connectionEstablished(packet);
  }

  protected async handlePublish(packet: PublishPacket) {
    if (packet.qos === 0) {
      this.emit("message", packet.topic, packet.payload, packet);
    } else if (packet.qos === 1) {
      if (typeof packet.id !== "number" || packet.id < 1) {
        return this.protocolViolation(
          "publish packet with qos 1 is missing id",
        );
      }

      this.emit("message", packet.topic, packet.payload, packet);

      this.send({
        type: "puback",
        id: packet.id,
      });
    } else if (packet.qos === 2) {
      if (typeof packet.id !== "number" || packet.id < 1) {
        return this.protocolViolation(
          "publish packet with qos 2 is missing id",
        );
      }

      const emitMessage = !packet.dup ||
        !(await this.incomingStore.has(packet.id));

      if (emitMessage) {
        this.incomingStore.store(packet.id);

        this.emit("message", packet.topic, packet.payload, packet);
      }

      this.send({
        type: "pubrec",
        id: packet.id,
      });
    }
  }

  protected handlePuback(packet: PubackPacket) {
    this.outgoingStore.discard(packet.id);

    const deferred = this.unresolvedPublishes.get(packet.id);

    if (deferred) {
      this.unresolvedPublishes.delete(packet.id);
      deferred.resolve();
    } else {
      this.log(`received puback packet with unrecognized id ${packet.id}`);
    }
  }

  protected handlePubrec(packet: PubrecPacket) {
    const pubrel: PubrelPacket = {
      type: "pubrel",
      id: packet.id,
    };

    this.outgoingStore.store(pubrel);

    this.send(pubrel);
  }

  protected handlePubrel(packet: PubrelPacket) {
    this.incomingStore.discard(packet.id);

    this.send({
      type: "pubcomp",
      id: packet.id,
    });
  }

  protected handlePubcomp(packet: PubcompPacket) {
    this.outgoingStore.discard(packet.id);

    const deferred = this.unresolvedPublishes.get(packet.id);

    if (deferred) {
      this.unresolvedPublishes.delete(packet.id);
      deferred.resolve();
    } else {
      this.log(`received pubcomp packet with unrecognized id ${packet.id}`);
    }
  }

  protected handleSuback(packet: SubackPacket) {
    const unacknowledgedSubscribe = this.unacknowledgedSubscribes.get(
      packet.id,
    );

    // TODO: verify returnCodes length matches subscriptions.length

    if (unacknowledgedSubscribe) {
      this.unacknowledgedSubscribes.delete(packet.id);

      let i = 0;

      for (const sub of unacknowledgedSubscribe.subscriptions) {
        sub.state = "acknowledged";
        sub.returnCode = packet.returnCodes[i++];

        const deferred = this.unresolvedSubscribes.get(sub.topicFilter);

        if (deferred) {
          this.unresolvedSubscribes.delete(sub.topicFilter);

          deferred.resolve(packet);
        }
      }
    } else {
      throw new Error(
        `received suback packet with unrecognized id ${packet.id}`,
      );
    }
  }

  protected handleUnsuback(packet: UnsubackPacket) {
    const unacknowledgedUnsubscribe = this.unacknowledgedUnsubscribes.get(
      packet.id,
    );

    if (unacknowledgedUnsubscribe) {
      this.unacknowledgedUnsubscribes.delete(packet.id);

      for (const sub of unacknowledgedUnsubscribe.subscriptions) {
        if (!sub) {
          continue;
        }

        sub.state = "unsubscribe-acknowledged";

        this.subscriptions = this.subscriptions.filter((s) => s !== sub);

        const deferred = this.unresolvedUnsubscribes.get(sub.topicFilter);

        if (deferred) {
          this.unresolvedUnsubscribes.delete(sub.topicFilter);

          deferred.resolve(packet);
        }
      }
    } else {
      throw new Error(
        `received unsuback packet with unrecognized id ${packet.id}`,
      );
    }
  }

  protected startConnectTimer() {
    this.startTimer(
      "connect",
      () => {
        this.connectTimedOut();
      },
      this.options.connectTimeout || defaultConnectTimeout,
    );
  }

  protected connectTimedOut() {
    switch (this.connectionState) {
      case "connecting":
        break;
      default:
        throw new Error(
          `connect timer should not be timing out in ${this.connectionState} state`,
        );
    }

    this.changeState("offline");

    this.close();

    this.notifyConnectRejected(new Error("connect timed out"));

    this.reconnectAttempt = 0;

    this.startReconnectTimer();
  }

  protected notifyConnectRejected(err: Error) {
    if (this.unresolvedConnect) {
      this.log("rejecting initial connect");

      this.unresolvedConnect.reject(err);
    }
  }

  protected stopConnectTimer() {
    if (this.timerExists("connect")) {
      this.stopTimer("connect");
    }
  }

  protected startReconnectTimer() {
    const options = this.options;

    let reconnectOptions;
    let defaultOptions;

    if (!this.everConnected) {
      reconnectOptions = options.connect || {};
      defaultOptions = defaultConnectOptions;
    } else {
      reconnectOptions = options.reconnect || {};
      defaultOptions = defaultReconnectOptions;
    }

    if (reconnectOptions === false) {
      return;
    } else if (reconnectOptions === true) {
      reconnectOptions = {};
    }

    const attempt = this.reconnectAttempt;
    const maxAttempts = reconnectOptions.retries ?? defaultOptions.retries;

    if (attempt >= maxAttempts) {
      return false;
    }

    // I started off using the formula in this article
    // https://dthain.blogspot.com/2009/02/exponential-backoff-in-distributed.html
    // but modified the random part so that the delay will be strictly
    // increasing.
    const min = reconnectOptions.minDelay ?? defaultOptions.minDelay;
    const max = reconnectOptions.maxDelay ?? defaultOptions.maxDelay;
    const factor = reconnectOptions.factor ?? defaultOptions.factor;
    const random = reconnectOptions.random ?? defaultOptions.random;

    // The old way:
    // const randomness = 1 + (random ? Math.random() : 0);
    // const delay = Math.floor(Math.min(randomness * min * Math.pow(factor, attempt), max));

    // The new way:
    const thisDelay = min * Math.pow(factor, attempt);
    const nextDelay = min * Math.pow(factor, attempt + 1);
    const diff = nextDelay - thisDelay;
    const randomness = random ? diff * Math.random() : 0;
    const delay = Math.floor(Math.min(thisDelay + randomness, max));

    this.log(`reconnect attempt ${attempt + 1} in ${delay}ms`);

    this.startTimer(
      "reconnect",
      () => {
        this.reconnectAttempt++;
        this.openConnection();
      },
      delay,
    );

    return true;
  }

  protected stopReconnectTimer() {
    if (this.timerExists("reconnect")) {
      this.stopTimer("reconnect");
    }
  }

  protected startKeepAliveTimer() {
    if (!this.keepAlive) {
      return;
    }

    // This method doesn't get called until after sending the connect packet
    // so this.lastPacketTime should have a value.
    const elapsed = Date.now() - this.lastPacketTime!.getTime();
    const timeout = this.keepAlive * 1000 - elapsed;

    this.startTimer("keepAlive", () => this.sendKeepAlive(), timeout);
  }

  protected stopKeepAliveTimer() {
    if (this.timerExists("keepAlive")) {
      this.stopTimer("keepAlive");
    }
  }

  protected async sendKeepAlive() {
    if (this.connectionState === "connected") {
      const elapsed = Date.now() - this.lastPacketTime!.getTime();
      const timeout = this.keepAlive * 1000;

      if (elapsed >= timeout) {
        await this.send({
          type: "pingreq",
        });

        // TODO: need a timer here to disconnect if we don't receive the pingres
      }

      this.startKeepAliveTimer();
    } else {
      this.log("keepAliveTimer should have been cancelled");
    }
  }

  protected stopTimers() {
    this.stopConnectTimer();
    this.stopReconnectTimer();
    this.stopKeepAliveTimer();
  }

  protected startTimer(
    name: string,
    cb: (...args: unknown[]) => void,
    delay: number,
  ) {
    if (this.timerExists(name)) {
      this.log(`timer ${name} already exists`);

      this.stopTimer(name);
    }

    this.log(`starting timer ${name} for ${delay}ms`);

    this.timers[name] = setTimeout(() => {
      delete this.timers[name];

      this.log(`invoking timer ${name} callback`);

      cb();
    }, delay);
  }

  protected stopTimer(name: string) {
    if (!this.timerExists(name)) {
      this.log(`no timer ${name} to stop`);

      return;
    }

    this.log(`stopping timer ${name}`);

    const id = this.timers[name];

    if (id) {
      clearTimeout(id);

      delete this.timers[name];
    }
  }

  protected timerExists(name: string) {
    return !!this.timers[name];
  }

  // Utility methods

  protected changeState(newState: ConnectionStates) {
    const oldState = this.connectionState;

    this.connectionState = newState;

    this.log(`connectionState: ${oldState} -> ${newState}`);

    this.emit("statechange", { from: oldState, to: newState });

    this.emit(newState);
  }

  protected generateClientId() {
    let clientId;

    if (typeof this.options.clientId === "string") {
      clientId = this.options.clientId;
    } else if (typeof this.options.clientId === "function") {
      clientId = this.options.clientId();
    } else {
      const prefix = this.options.clientIdPrefix || defaultClientIdPrefix;
      const suffix = Math.random().toString(36).slice(2);

      clientId = `${prefix}-${suffix}`;
    }

    return clientId;
  }

  private getURL(): URL {
    let url: URL | string | void = typeof this.options.url === "function"
      ? this.options.url()
      : this.options.url;

    if (!url) {
      url = this.getDefaultURL();
    }

    if (typeof url === "string") {
      url = this.parseURL(url);
    }

    const protocol = url.protocol.slice(0, -1);

    if (!url.port) {
      url.port = defaultPorts[protocol].toString();
    }

    this.validateURL(url);

    return url;
  }

  protected parseURL(url: string) {
    let parsed = new URL(url);

    // When Deno and browsers parse "mqtt:" URLs, they return "//host:port/path"
    // in the `pathname` property and leave `host`, `hostname`, and `port`
    // blank. This works around that by re-parsing as an "http:" URL and then
    // changing the protocol back to "mqtt:". Node.js doesn't behave like this.
    if (!parsed.hostname && parsed.pathname.startsWith("//")) {
      const protocol = parsed.protocol;
      parsed = new URL(url.replace(protocol, "http:"));
      parsed.protocol = protocol;
    }

    return parsed;
  }

  protected nextPacketId() {
    this.lastPacketId = (this.lastPacketId + 1) % packetIdLimit;

    // Don't allow packet id to be 0.
    if (!this.lastPacketId) {
      this.lastPacketId = 1;
    }

    return this.lastPacketId;
  }

  protected async send(packet: AnyPacket) {
    this.log(`sending ${packet.type} packet`, packet);

    this.emit("packetsend", packet);

    const bytes = this.encode(packet);

    this.emit("bytessent", bytes);

    await this.write(bytes);

    this.lastPacketTime = new Date();
  }

  public on(eventName: string, listener: ClientEventListener) {
    let listeners = this.eventListeners.get(eventName);

    if (!listeners) {
      listeners = [];
      this.eventListeners.set(eventName, listeners);
    }

    listeners.push(listener);
  }

  public off(eventName: string, listener: (...args: unknown[]) => void) {
    const listeners = this.eventListeners.get(eventName);

    if (listeners) {
      this.eventListeners.set(
        eventName,
        listeners.filter((l) => l !== listener),
      );
    }
  }

  protected emit(eventName: string, ...args: unknown[]) {
    const listeners = this.eventListeners.get(eventName);

    if (listeners) {
      for (const listener of listeners) {
        listener(...args);
      }
    }
  }
}

class Deferred<T> {
  promise: Promise<T>;
  resolve!: (val: T) => void;
  reject!: (err: Error) => void;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
