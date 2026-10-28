declare module "iframe-resizer/js/iframeResizer" {
  export interface ResizedEvent {
    iframe: HTMLIFrameElement;
    height: number;
    width: number;
    type: string;
  }
  export interface IFrameComponent extends HTMLIFrameElement {
    iFrameResizer: { removeListeners: () => void; close: () => void };
  }
  export interface Options {
    checkOrigin?: boolean | string[];
    log?: boolean;
    scrolling?: boolean | "omit";
    warningTimeout?: number;
    onResized?: (e: ResizedEvent) => void;
  }
  const iframeResize: (options: Options, target: HTMLIFrameElement) => IFrameComponent[];
  export default iframeResize;
}
