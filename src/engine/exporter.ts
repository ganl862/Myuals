import * as Mp4Muxer from 'mp4-muxer';
import * as WebMMuxer from 'webm-muxer';
import { FPS } from './motionMath';
import { CanvasDimensions, mapProgressToClipTimeSec, MediaClipItem } from './mediaTimeline';
import {
  ComposableCanvasRenderer,
  LoadedMediaSource,
  resolveActiveDurationMs,
} from './composableRenderer';
import { AttachedEffectInstance, ClipTransitionAssignment } from './registry';
import { TextLayerConfig } from './typography';

export type ExportFormat = 'mp4' | 'webm';

export interface ExportProgress {
  frame: number;
  totalFrames: number;
  percent: number;
  stage: 'preparing' | 'encoding' | 'muxing' | 'done';
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  format: ExportFormat;
  encoderUsed: 'webcodecs-mp4' | 'webcodecs-webm' | 'mediarecorder-webm';
  durationMs: number;
}

async function seekVideoToTime(video: HTMLVideoElement, targetSec: number): Promise<void> {
  const clamped = Math.max(0, Math.min(video.duration || targetSec, targetSec));
  if (Math.abs(video.currentTime - clamped) < 0.015 && video.readyState >= 2) {
    return;
  }
  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', done);
      resolve();
    };
    video.addEventListener('seeked', done, { once: true });
    video.currentTime = clamped;
    setTimeout(done, 180);
  });
}

async function syncSourcesForExportFrame(
  clips: MediaClipItem[],
  mediaSources: Map<string, LoadedMediaSource>,
  timeMs: number,
  totalDurationMs: number
): Promise<void> {
  const tasks: Promise<void>[] = [];
  const isSingle = clips.length === 1;
  const clip1 = clips[0];
  const clip2 = clips[1];
  const clip3 = clips[2];

  const cutPoint = totalDurationMs * 0.45;
  const c1Prog = isSingle ? timeMs / totalDurationMs : Math.min(1, timeMs / cutPoint);
  const c2Prog = Math.max(0, Math.min(1, (timeMs - cutPoint) / (totalDurationMs - cutPoint)));
  const c3Prog = Math.max(0, Math.min(1, (timeMs - totalDurationMs * 0.86) / (totalDurationMs * 0.14)));

  if (clip1) {
    const src1 = mediaSources.get(clip1.id);
    if (src1?.kind === 'video') {
      tasks.push(seekVideoToTime(src1.element, mapProgressToClipTimeSec(clip1, c1Prog)));
    }
  }
  if (!isSingle && clip2 && clip2.id !== clip1?.id) {
    const src2 = mediaSources.get(clip2.id);
    if (src2?.kind === 'video') {
      tasks.push(seekVideoToTime(src2.element, mapProgressToClipTimeSec(clip2, c2Prog)));
    }
  }
  if (clip3) {
    const src3 = mediaSources.get(clip3.id);
    if (src3?.kind === 'video') {
      tasks.push(seekVideoToTime(src3.element, mapProgressToClipTimeSec(clip3, c3Prog)));
    }
  }
  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
}

async function pickSupportedVideoCodec(
  format: ExportFormat,
  width: number,
  height: number
): Promise<{ codec: string; muxerCodec: 'avc' | 'V_VP9' | 'V_VP8' } | null> {
  if (typeof VideoEncoder === 'undefined') return null;

  const candidates: Array<{ codec: string; muxerCodec: 'avc' | 'V_VP9' | 'V_VP8' }> =
    format === 'mp4'
      ? [
          { codec: 'avc1.42001f', muxerCodec: 'avc' },
          { codec: 'avc1.4d002a', muxerCodec: 'avc' },
          { codec: 'avc1.640028', muxerCodec: 'avc' },
        ]
      : [
          { codec: 'vp09.00.10.08', muxerCodec: 'V_VP9' },
          { codec: 'vp8', muxerCodec: 'V_VP8' },
        ];

  for (const candidate of candidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec: candidate.codec,
        width,
        height,
        bitrate: 6_000_000,
        framerate: FPS,
      });
      if (support.supported) {
        return candidate;
      }
    } catch {
      // Try next codec
    }
  }
  return null;
}

export async function exportTransitionVideo(params: {
  format: ExportFormat;
  dimensions: CanvasDimensions;
  clips: MediaClipItem[];
  clipAssignments: Record<string, ClipTransitionAssignment>;
  textEffects: AttachedEffectInstance[];
  mediaSources: Map<string, LoadedMediaSource>;
  textConfig: TextLayerConfig;
  useWebGL: boolean;
  onProgress: (p: ExportProgress) => void;
  abortSignal?: AbortSignal;
}): Promise<ExportResult> {
  const {
    format,
    dimensions,
    clips,
    clipAssignments,
    textEffects,
    mediaSources,
    textConfig,
    useWebGL,
    onProgress,
    abortSignal,
  } = params;

  const startMs = performance.now();
  const totalDurationMs = resolveActiveDurationMs(clips, clipAssignments);
  const totalFrames = Math.max(2, Math.round((totalDurationMs / 1000) * FPS));
  const width = Math.max(2, Math.floor(dimensions.width / 2) * 2);
  const height = Math.max(2, Math.floor(dimensions.height / 2) * 2);
  const exportDims: CanvasDimensions = { width, height, aspectRatio: width / height };

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;

  const renderer = new ComposableCanvasRenderer(width, height);

  onProgress({
    frame: 0,
    totalFrames,
    percent: 0,
    stage: 'preparing',
  });

  try {
    let targetFormat = format;
    let codecPick = await pickSupportedVideoCodec(targetFormat, width, height);

    if (!codecPick && targetFormat === 'mp4') {
      targetFormat = 'webm';
      codecPick = await pickSupportedVideoCodec('webm', width, height);
    }

    if (codecPick && typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
      if (targetFormat === 'mp4' && codecPick.muxerCodec === 'avc') {
        const muxer = new Mp4Muxer.Muxer({
          target: new Mp4Muxer.ArrayBufferTarget(),
          video: { codec: 'avc', width, height },
          fastStart: 'in-memory',
          firstTimestampBehavior: 'offset',
        });

        let encoderError: Error | null = null;
        const encoder = new VideoEncoder({
          output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
          error: (err) => {
            encoderError = err instanceof Error ? err : new Error(String(err));
          },
        });

        encoder.configure({
          codec: codecPick.codec,
          width,
          height,
          bitrate: 6_500_000,
          framerate: FPS,
        });

        const frameDurationUs = Math.round(1_000_000 / FPS);

        for (let f = 0; f < totalFrames; f++) {
          if (abortSignal?.aborted) {
            encoder.close();
            throw new Error('Export cancelled');
          }
          if (encoderError) throw encoderError;

          const tMs = Math.min(totalDurationMs, (f / (totalFrames - 1)) * totalDurationMs);
          await syncSourcesForExportFrame(clips, mediaSources, tMs, totalDurationMs);

          renderer.renderFrame(exportCanvas, {
            timeMs: tMs,
            totalDurationMs,
            dimensions: exportDims,
            clips,
            clipAssignments,
            textEffects,
            mediaSources,
            textConfig,
            useWebGL,
          });

          const videoFrame = new VideoFrame(exportCanvas, {
            timestamp: f * frameDurationUs,
            duration: frameDurationUs,
          });
          encoder.encode(videoFrame, { keyFrame: f % 30 === 0 });
          videoFrame.close();

          if (f % 5 === 0 || f === totalFrames - 1) {
            onProgress({
              frame: f + 1,
              totalFrames,
              percent: Math.round(((f + 1) / totalFrames) * 92),
              stage: 'encoding',
            });
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        onProgress({ frame: totalFrames, totalFrames, percent: 96, stage: 'muxing' });
        await encoder.flush();
        encoder.close();
        muxer.finalize();

        const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
        onProgress({ frame: totalFrames, totalFrames, percent: 100, stage: 'done' });

        return {
          blob,
          filename: `kineticard-composable-60fps.mp4`,
          format: 'mp4',
          encoderUsed: 'webcodecs-mp4',
          durationMs: Math.round(performance.now() - startMs),
        };
      } else {
        const webmCodec = codecPick.muxerCodec === 'V_VP8' ? 'V_VP8' : 'V_VP9';
        const muxer = new WebMMuxer.Muxer({
          target: new WebMMuxer.ArrayBufferTarget(),
          video: { codec: webmCodec, width, height, frameRate: FPS },
          firstTimestampBehavior: 'offset',
        });

        let encoderError: Error | null = null;
        const encoder = new VideoEncoder({
          output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
          error: (err) => {
            encoderError = err instanceof Error ? err : new Error(String(err));
          },
        });

        encoder.configure({
          codec: codecPick.codec,
          width,
          height,
          bitrate: 6_000_000,
          framerate: FPS,
        });

        const frameDurationUs = Math.round(1_000_000 / FPS);

        for (let f = 0; f < totalFrames; f++) {
          if (abortSignal?.aborted) {
            encoder.close();
            throw new Error('Export cancelled');
          }
          if (encoderError) throw encoderError;

          const tMs = Math.min(totalDurationMs, (f / (totalFrames - 1)) * totalDurationMs);
          await syncSourcesForExportFrame(clips, mediaSources, tMs, totalDurationMs);

          renderer.renderFrame(exportCanvas, {
            timeMs: tMs,
            totalDurationMs,
            dimensions: exportDims,
            clips,
            clipAssignments,
            textEffects,
            mediaSources,
            textConfig,
            useWebGL,
          });

          const videoFrame = new VideoFrame(exportCanvas, {
            timestamp: f * frameDurationUs,
            duration: frameDurationUs,
          });
          encoder.encode(videoFrame, { keyFrame: f % 30 === 0 });
          videoFrame.close();

          if (f % 5 === 0 || f === totalFrames - 1) {
            onProgress({
              frame: f + 1,
              totalFrames,
              percent: Math.round(((f + 1) / totalFrames) * 92),
              stage: 'encoding',
            });
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        onProgress({ frame: totalFrames, totalFrames, percent: 96, stage: 'muxing' });
        await encoder.flush();
        encoder.close();
        muxer.finalize();

        const blob = new Blob([muxer.target.buffer], { type: 'video/webm' });
        onProgress({ frame: totalFrames, totalFrames, percent: 100, stage: 'done' });

        return {
          blob,
          filename: `kineticard-composable-60fps.webm`,
          format: 'webm',
          encoderUsed: 'webcodecs-webm',
          durationMs: Math.round(performance.now() - startMs),
        };
      }
    }

    const stream = exportCanvas.captureStream(FPS);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };
    const stopped = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });
    recorder.start();
    const stepMs = 1000 / FPS;
    for (let f = 0; f < totalFrames; f++) {
      if (abortSignal?.aborted) {
        recorder.stop();
        throw new Error('Export cancelled');
      }
      const tMs = Math.min(totalDurationMs, (f / (totalFrames - 1)) * totalDurationMs);
      renderer.renderFrame(exportCanvas, {
        timeMs: tMs,
        totalDurationMs,
        dimensions: exportDims,
        clips,
        clipAssignments,
        textEffects,
        mediaSources,
        textConfig,
        useWebGL,
      });
      onProgress({
        frame: f + 1,
        totalFrames,
        percent: Math.round(((f + 1) / totalFrames) * 95),
        stage: 'encoding',
      });
      await new Promise((r) => setTimeout(r, stepMs));
    }
    recorder.stop();
    const blob = await stopped;
    onProgress({ frame: totalFrames, totalFrames, percent: 100, stage: 'done' });
    return {
      blob,
      filename: `kineticard-composable-60fps.webm`,
      format: 'webm',
      encoderUsed: 'mediarecorder-webm',
      durationMs: Math.round(performance.now() - startMs),
    };
  } finally {
    renderer.dispose();
  }
}
