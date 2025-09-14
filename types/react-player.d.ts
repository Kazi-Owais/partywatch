import "react-player";

export type { ReactPlayerRef } from "react-player";

declare module "react-player" {
  export interface Config {
    file?: {
      attributes?: {
        controlsList?: string;
        disablePictureInPicture?: boolean;
        [key: string]: any;
      };
      [key: string]: any;
    };
  }

  export interface ReactPlayerProps {
    url?: string | string[] | MediaStream | null;
    playing?: boolean;
    controls?: boolean;
    width?: string | number;
    height?: string | number;
    onPlay?: () => void;
    onPause?: () => void;
    onSeeked?: () => void;
    config?: {
      file?: {
        attributes?: React.HTMLAttributes<HTMLVideoElement>;
        [key: string]: any;
      };
      [key: string]: any;
    };
    [key: string]: any;
  }

  export type ReactPlayerRef = {
    seekTo: (amount: number, type?: 'seconds' | 'fraction') => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    getInternalPlayer: () => any;
    showPreview: () => void;
    getInternalPlayer: (key?: string) => any;
  };

  export interface BaseReactPlayerProps {
    url?: string | string[] | MediaStream | null;
    playing?: boolean;
    loop?: boolean;
    controls?: boolean;
    volume?: number;
    muted?: boolean;
    playbackRate?: number;
    width?: string | number;
    height?: string | number;
    style?: React.CSSProperties;
    progressInterval?: number;
    playsinline?: boolean;
    playIcon?: React.ReactNode;
    previewTabIndex?: number;
    pip?: boolean;
    stopOnUnmount?: boolean;
    fallback?: React.ReactNode;
    wrapper?: React.ComponentType<{ children: React.ReactNode }>;
    onReady?: (player: ReactPlayerRef) => void;
    onStart?: () => void;
    onPlay?: () => void;
    onPause?: () => void;
    onBuffer?: () => void;
    onBufferEnd?: () => void;
    onEnded?: () => void;
    onError?: (error: any, data?: any, hlsInstance?: any, hlsGlobal?: any) => void;
    onDuration?: (duration: number) => void;
    onSeek?: (seconds: number) => void;
    onProgress?: (state: {
      played: number;
      playedSeconds: number;
      loaded: number;
      loadedSeconds: number;
    }) => void;
    [otherProps: string]: any;
  }

  const ReactPlayer: React.ForwardRefExoticComponent<
    BaseReactPlayerProps & React.RefAttributes<ReactPlayerRef>
  >;

  export default ReactPlayer;
}
