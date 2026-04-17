export class ScreenCapture {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  async start(): Promise<MediaStream> {
    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 5 },
      audio: false,
    });
    this.video = document.createElement('video');
    this.video.srcObject = this.stream;
    this.video.muted = true;
    await this.video.play();
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;

    // Handle user stopping share via browser UI
    this.stream.getVideoTracks()[0].addEventListener('ended', () => {
      this.stop();
    });

    return this.stream;
  }

  stop() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.video = null;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  isReady(): boolean {
    return !!(this.video && this.stream && !this.stream.getVideoTracks()[0]?.ended && this.canvas.width > 0);
  }

  captureFrame(): string | null {
    if (!this.isReady() || !this.video) return null;
    if (
      this.canvas.width !== this.video.videoWidth ||
      this.canvas.height !== this.video.videoHeight
    ) {
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
    }
    this.ctx.drawImage(this.video, 0, 0);
    // Use jpeg at 0.85 quality — good balance of clarity vs token cost
    return this.canvas.toDataURL('image/jpeg', 0.85);
  }
}
