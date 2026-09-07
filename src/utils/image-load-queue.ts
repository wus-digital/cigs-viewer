export interface ImageLoadPlan {
  key: string;
  current: string | undefined;
  batches: readonly (readonly string[])[];
  frames?: ReadonlyMap<string, string>;
}

interface Snapshot {
  key: string;
  loaded: ReadonlySet<string>;
  failed: ReadonlySet<string>;
  retained: ReadonlyMap<string, string>;
}

export class ImageLoadQueue {
  private plan: ImageLoadPlan;
  private snapshot: Snapshot;
  private readonly initialSnapshot: Snapshot;
  private readonly listeners = new Set<() => void>();
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly attempted = new Set<string>();
  private readonly retained = new Map<
    string,
    { src: string; image: HTMLImageElement }
  >();
  private readonly workers = new Map<string, HTMLImageElement>();
  private running = false;
  private waitingForCurrent = true;

  constructor(plan: ImageLoadPlan) {
    this.plan = plan;
    this.snapshot = {
      key: plan.key,
      loaded: new Set(),
      failed: new Set(),
      retained: new Map(),
    };
    this.initialSnapshot = this.snapshot;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => this.initialSnapshot;

  private publish() {
    this.snapshot = {
      key: this.plan.key,
      loaded: new Set(this.images.keys()),
      failed: new Set(
        [...this.attempted].filter((src) => !this.images.has(src))
      ),
      retained: new Map([...this.retained].map(([key, { src }]) => [key, src])),
    };
    for (const listener of this.listeners) listener();
  }

  private abortWorkers() {
    const images = [...this.workers.values()];
    this.workers.clear();
    for (const image of images) {
      image.onload = null;
      image.onerror = null;
      image.removeAttribute('src');
    }
  }

  start(plan: ImageLoadPlan) {
    if (this.running && plan.key === this.plan.key) return;
    this.abortWorkers();
    this.plan = plan;
    this.running = true;
    const relevant = new Set([plan.current, ...plan.batches.flat()]);
    for (const key of this.retained.keys()) {
      if (!plan.frames?.has(key)) this.retained.delete(key);
    }
    for (const src of this.images.keys()) {
      if (!relevant.has(src)) this.images.delete(src);
    }
    for (const src of this.attempted) {
      if (!relevant.has(src)) this.attempted.delete(src);
    }
    this.waitingForCurrent = !!plan.current && !this.images.has(plan.current);
    this.publish();
    this.pump();
  }

  stop() {
    this.running = false;
    this.abortWorkers();
  }

  settleCurrent(key: string, image: HTMLImageElement, loaded: boolean) {
    if (
      key !== this.plan.key ||
      image.getAttribute('src') !== this.plan.current
    )
      return;
    const src = this.plan.current;
    if (!src) return;
    if (loaded) this.remember(src, image);
    this.attempted.add(src);
    this.waitingForCurrent = false;
    this.publish();
    this.pump();
  }

  retryCurrent(key: string) {
    if (key !== this.plan.key) return;
    this.abortWorkers();
    if (this.plan.current) {
      this.images.delete(this.plan.current);
      this.attempted.delete(this.plan.current);
    }
    this.waitingForCurrent = true;
    this.publish();
  }

  private remember(src: string, image: HTMLImageElement) {
    this.images.set(src, image);
    for (const [key, frameSrc] of this.plan.frames ?? []) {
      if (frameSrc === src) this.retained.set(key, { src, image });
    }
  }

  private pump() {
    if (!this.running || this.waitingForCurrent || this.workers.size) return;
    const isPending = (src: string) =>
      src !== this.plan.current && !this.attempted.has(src);
    const batch = this.plan.batches.find((sources) => sources.some(isPending));
    if (!batch) return;
    // Reserve the whole batch before starting requests, including synchronous cache hits.
    const workers = [...new Set(batch)].filter(isPending).map((src) => {
      const image = new Image();
      this.workers.set(src, image);
      return { src, image };
    });
    for (const { src, image } of workers) {
      if (this.workers.get(src) !== image || !this.running) return;
      image.decoding = 'async';
      image.fetchPriority = 'low';
      const settle = (loaded: boolean) => {
        if (this.workers.get(src) !== image || !this.running) return;
        this.workers.delete(src);
        image.onload = null;
        image.onerror = null;
        this.attempted.add(src);
        if (loaded) this.remember(src, image);
        this.publish();
        this.pump();
      };
      image.onload = () => settle(true);
      image.onerror = () => settle(false);
      image.src = src;
      if (image.complete) settle(image.naturalWidth > 0);
    }
  }
}
