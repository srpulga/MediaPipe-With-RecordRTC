import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterOutlet} from '@angular/router';
import {SelfieSegmentation} from '@mediapipe/selfie_segmentation';
import RecordRTC from 'recordrtc';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit {

  @ViewChild('videoElement') videoElementRef!: ElementRef;
  @ViewChild('canvasElement') canvasElementRef!: ElementRef;

  private selfieSegmentation: SelfieSegmentation;
  private recorder: any;
  private isBackgroundBlurred = true;


  constructor() {
    this.selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });

    // Configure the model options
    this.selfieSegmentation.setOptions({
      modelSelection: 1,
    });
  }

  ngAfterViewInit() {
    this.setupVideoStream();
  }

  toggleBackgroundBlur() {
    this.isBackgroundBlurred = !this.isBackgroundBlurred;
  }

  setupVideoStream(): void {
    const videoElement: HTMLVideoElement = this.videoElementRef.nativeElement;

    navigator.mediaDevices.getUserMedia({video: true})
      .then(stream => {
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
          videoElement.play();
          this.processVideo(); // Call processVideo here
        };
      })
      .catch(err => {
        console.error('Error accessing media devices.', err);
      });
  }

  onResults(results: any) {
    const videoElement: HTMLVideoElement = this.videoElementRef.nativeElement;
    const canvasElement: HTMLCanvasElement = this.canvasElementRef.nativeElement;
    const canvasCtx = canvasElement.getContext('2d');

    if (!canvasCtx) {
      return;
    }
    canvasCtx.save();

    // Clear the canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw the original video frame to the canvas
    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

    // Draw the segmentation mask where the person is
    // This will "cut out" the person and keep them sharp
    canvasCtx.globalCompositeOperation = 'destination-in';
    canvasCtx.filter = 'none'; // No blur for the person
    canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);

    // Draw the background with blur
    // Use the segmentation mask to only blur the background
    canvasCtx.globalCompositeOperation = 'destination-over';
    if (this.isBackgroundBlurred) {
      canvasCtx.filter = 'blur(4px)';
    } else {
      canvasCtx.filter = 'none';
    }// Adjust blur level as needed
    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.restore();
  }


  processVideo() {
    const videoElement: HTMLVideoElement = this.videoElementRef.nativeElement;

    // ... setup for processing video ...
    this.selfieSegmentation.onResults(this.onResults.bind(this));

    const processFrame = () => {
      this.selfieSegmentation.send({image: videoElement}).then(() => {
        requestAnimationFrame(processFrame);
      });
    };

    processFrame();
  }

  startRecording() {
    const canvasElement: HTMLCanvasElement = this.canvasElementRef.nativeElement;
    const stream = canvasElement.captureStream(30); // 30 fps



    this.recorder = new RecordRTC(stream, {
      type: 'video'
    });

    this.recorder.startRecording();
    console.log('Recording started');
  }

  stopRecording() {
    this.recorder.stopRecording(() => {
      const recordedBlob = this.recorder.getBlob();

      // Handle the recorded blob here (e.g., download it, save to file, etc.)
      // Example: Download the video file
      const downloadUrl = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      a.download = 'recorded-video.webm';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
    });
    console.log('Recording stopped');
  }
}
