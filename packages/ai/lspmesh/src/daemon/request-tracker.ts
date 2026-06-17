/** A captured outstanding JSON-RPC request, kept verbatim for replay. */
export interface PendingRequest {
    id: number | string;
    /** The exact stdio frame bytes originally sent toward the daemon. */
    frame: Buffer;
}

interface ParsedMessage {
    id?: number | string;
    method?: string;
}

/**
 * Splits a `Content-Length`-framed LSP/MCP byte stream into individual message
 * frames, buffering partial trailing data across chunks.
 */
class StreamParser {
    #buf = Buffer.alloc(0);

    /**
     * Append bytes and yield `{ msg, frame }` for each complete message.
     * @param chunk Bytes read from one direction of the stream.
     * @returns The messages (parsed header+body) completed by this chunk.
     */
    push(chunk: Buffer): { msg: ParsedMessage; frame: Buffer }[] {
        this.#buf = Buffer.concat([this.#buf, chunk]);
        const out: { msg: ParsedMessage; frame: Buffer }[] = [];
        for (;;) {
            const headerEnd = this.#buf.indexOf('\r\n\r\n');
            if (headerEnd === -1) break;
            const header = this.#buf.subarray(0, headerEnd).toString('ascii');
            const match = /content-length:\s*(\d+)/i.exec(header);
            if (!match?.[1]) {
                this.#buf = this.#buf.subarray(headerEnd + 4);
                continue;
            }
            const len = Number(match[1]);
            const bodyStart = headerEnd + 4;
            if (this.#buf.length < bodyStart + len) break;
            const frame = this.#buf.subarray(0, bodyStart + len);
            const body = this.#buf.subarray(bodyStart, bodyStart + len);
            this.#buf = this.#buf.subarray(bodyStart + len);
            try {
                out.push({ msg: JSON.parse(body.toString('utf8')) as ParsedMessage, frame: Buffer.from(frame) });
            } catch {
                /* malformed body — skip, framing already advanced */
            }
        }
        return out;
    }
}

/**
 * Tracks JSON-RPC requests flowing toward the daemon and clears them when their
 * responses return, so a client can replay still-unanswered requests once after
 * the daemon dies mid-flight.
 */
export class RequestTracker {
    readonly #pending = new Map<number | string, Buffer>();
    readonly #toDaemon = new StreamParser();
    readonly #fromDaemon = new StreamParser();

    /**
     * Observe bytes the client is forwarding to the daemon.
     * @param chunk Bytes sent toward the daemon.
     */
    observeToDaemon(chunk: Buffer): void {
        for (const { msg, frame } of this.#toDaemon.push(chunk)) {
            if (msg.id !== undefined && msg.method !== undefined) this.#pending.set(msg.id, frame);
        }
    }

    /**
     * Observe bytes the daemon is sending back; clears answered requests.
     * @param chunk Bytes received from the daemon.
     */
    observeFromDaemon(chunk: Buffer): void {
        for (const { msg } of this.#fromDaemon.push(chunk)) {
            if (msg.id !== undefined && msg.method === undefined) this.#pending.delete(msg.id);
        }
    }

    /**
     * Requests still awaiting a response, in insertion order.
     * @returns The pending requests with their verbatim frames.
     */
    outstanding(): PendingRequest[] {
        return [...this.#pending.entries()].map(([id, frame]) => ({ id, frame }));
    }
}
