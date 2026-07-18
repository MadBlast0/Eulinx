import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// xterm.js needs canvas context in jsdom — stub it out
if (!HTMLCanvasElement.prototype.getContext.__original) {
  const originalGetContext = HTMLCanvasElement.prototype.getContext.bind(HTMLCanvasElement.prototype);
  HTMLCanvasElement.prototype.getContext = function (
    type: string,
    attrs?: Record<string, unknown>,
  ): RenderingContext | null {
    if (type === "2d") {
      return {
        fillRect: () => {},
        clearRect: () => {},
        strokeRect: () => {},
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(0), width: 0, height: 0, colorSpace: "srgb" as PredefinedColorSpace }),
        putImageData: () => {},
        createImageData: () => ({ data: new Uint8ClampedArray(0), width: 0, height: 0, colorSpace: "srgb" as PredefinedColorSpace }),
        setTransform: () => {},
        resetTransform: () => {},
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        fill: () => {},
        stroke: () => {},
        arc: () => {},
        measureText: () => ({ width: 0 }),
        scale: () => {},
        translate: () => {},
        rotate: () => {},
        clip: () => {},
        rect: () => {},
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        canvas: document.createElement("canvas"),
        fillStyle: "",
        strokeStyle: "",
        font: "",
        textAlign: "" as CanvasTextAlign,
        textBaseline: "" as CanvasTextBaseline,
        globalAlpha: 1,
        globalCompositeOperation: "source-over" as GlobalCompositeOperation,
        lineWidth: 1,
        lineCap: "butt" as CanvasLineCap,
        lineJoin: "miter" as CanvasLineJoin,
        miterLimit: 10,
        shadowBlur: 0,
        shadowColor: "",
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        lineDashOffset: 0,
        setLineDash: () => {},
        getLineDash: () => [],
      } as unknown as CanvasRenderingContext2D;
    }
    if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") {
      return {
        canvas: document.createElement("canvas"),
        getExtension: () => null,
        getParameter: () => 0,
        createBuffer: () => ({}),
        createShader: () => ({}),
        shaderSource: () => {},
        compileShader: () => {},
        createProgram: () => ({}),
        attachShader: () => {},
        linkProgram: () => {},
        useProgram: () => {},
        getAttribLocation: () => 0,
        getUniformLocation: () => ({}),
        enableVertexAttribArray: () => {},
        vertexAttribPointer: () => {},
        uniform1f: () => {},
        uniform1i: () => {},
        uniform2f: () => {},
        uniform4f: () => {},
        drawArrays: () => {},
        viewport: () => {},
        clearColor: () => {},
        clear: () => {},
        enable: () => {},
        disable: () => {},
        blendFunc: () => {},
        createTexture: () => ({}),
        bindTexture: () => {},
        texParameteri: () => {},
        texImage2D: () => {},
        pixelStorei: () => {},
        activeTexture: () => {},
        getShaderParameter: () => true,
        getProgramParameter: () => true,
      } as unknown as WebGLRenderingContext;
    }
    return originalGetContext(type, attrs);
  } as typeof HTMLCanvasElement.prototype.getContext;
  (HTMLCanvasElement.prototype.getContext as Record<string, unknown>).__original = true;
}
