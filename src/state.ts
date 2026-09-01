import { useSyncExternalStore } from "react"

const CAPTURE_MODES = ["none", "lightness", "protan", "deutan", "tritan"] as const;

// 配列から型を自動生成
type CaptureMode = (typeof CAPTURE_MODES)[number] | undefined;

function isCaptureMode(value: any): value is CaptureMode {
    return value === undefined || (CAPTURE_MODES as readonly any[]).includes(value);
}

type Settings = {
    grid: number
    opacity: number
    lineWidth: number
    color: string
    rotation: number
    measureUnit: number
    measureUnitSet: { start: { x: number, y: number }, end: { x: number, y: number } }
    captureImage?: {
        path?: string; // path or buffer が入る
        buffer?: ArrayBuffer; // path or buffer が入る
        sourceWidth: number;
        sourceHeight: number;
        cropX: number;
        cropY: number;
        cropWidth: number;
        cropHeight: number;
    } | null | undefined
    captureMode?: CaptureMode;

}

export type ToolMode = "measure" | "draw" | "color" | "capture" | "deskel" | "image"
type Target = "screen" | "image"
type AppState = Settings & {
    clickThrough: boolean
    alwaysOnTop: boolean
    target: Target
    tool: ToolMode
}

type Listener = () => void

const DEFAULT_SETTINGS: Settings = {
    grid: 80,
    opacity: 0.7,
    lineWidth: 1,
    color: "#00ff88",
    rotation: 0,
    measureUnit: 20,
    measureUnitSet: { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } },
    captureMode: "lightness"
}

const SETTINGS_KEY = "tetorica-colors-settings"

function loadSettings(): Settings {
    console.log("> loadSettings")
    try {
        const raw = localStorage.getItem(SETTINGS_KEY)
        if (!raw) {
            return DEFAULT_SETTINGS
        }

        const parsed = JSON.parse(raw) as Partial<Settings>
        console.log(">> ", parsed)

        return {
            grid: typeof parsed.grid === "number" ? parsed.grid : DEFAULT_SETTINGS.grid,
            opacity: typeof parsed.opacity === "number" ? parsed.opacity : DEFAULT_SETTINGS.opacity,
            lineWidth:
                typeof parsed.lineWidth === "number"
                    ? parsed.lineWidth
                    : DEFAULT_SETTINGS.lineWidth,
            color: typeof parsed.color === "string" ? parsed.color : DEFAULT_SETTINGS.color,
            rotation:
                typeof parsed.rotation === "number"
                    ? parsed.rotation
                    : DEFAULT_SETTINGS.rotation,
            measureUnit:
                typeof parsed.measureUnit === "number" && parsed.measureUnit > 0
                    ? parsed.measureUnit
                    : DEFAULT_SETTINGS.measureUnit,
            measureUnitSet:
                typeof parsed.measureUnitSet === "object" && parsed.measureUnitSet !== null
                    ? {
                        start: {
                            x: typeof parsed.measureUnitSet.start?.x === "number"
                                ? parsed.measureUnitSet.start.x
                                : DEFAULT_SETTINGS.measureUnitSet.start.x,
                            y: typeof parsed.measureUnitSet.start?.y === "number"
                                ? parsed.measureUnitSet.start.y
                                : DEFAULT_SETTINGS.measureUnitSet.start.y,
                        },
                        end: {
                            x: typeof parsed.measureUnitSet.end?.x === "number"
                                ? parsed.measureUnitSet.end.x
                                : DEFAULT_SETTINGS.measureUnitSet.end.x,
                            y: typeof parsed.measureUnitSet.end?.y === "number"
                                ? parsed.measureUnitSet.end.y
                                : DEFAULT_SETTINGS.measureUnitSet.end.y,
                        },
                    }
                    : DEFAULT_SETTINGS.measureUnitSet,
            captureMode:
                isCaptureMode(parsed.captureMode) && parsed.captureImage
                    ? parsed.captureMode
                    : DEFAULT_SETTINGS.captureMode,
        }
    } catch (error) {
        console.error("failed to load settings", error)
        return DEFAULT_SETTINGS
    }
}

function saveSettings(settings: Settings): void {
    console.log("> saveSettings")
    try {
        console.log(">> ", settings)
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
        console.error("failed to save settings", error)
    }
}

class AppStateStore {
    private static _instance: AppStateStore

    private _listeners: Set<Listener> = new Set()

    private _state: AppState

    private constructor() {
        const saved = loadSettings()
        console.log("saved ", saved)

        this._state = {
            grid: saved.grid,
            opacity: saved.opacity,
            lineWidth: saved.lineWidth,
            color: saved.color,
            clickThrough: false,
            alwaysOnTop: false,
            target: "screen",
            rotation: saved.rotation,
            tool: "color",
            measureUnit: saved.measureUnit,
            measureUnitSet: saved.measureUnitSet,
            captureMode: saved.captureMode,
        }
    }

    public static Instance(): AppStateStore {
        return this._instance || (this._instance = new AppStateStore())
    }

    public getState(): AppState {
        return this._state
    }

    public subscribe(listener: Listener): () => void {
        this._listeners.add(listener)
        return () => {
            this._listeners.delete(listener)
        }
    }

    private emit(): void {
        this._listeners.forEach((listener) => {
            listener()
        })
    }

    public setState(partial: Partial<AppState>): void {
        const prev = this._state
        this._state = {
            ...this._state,
            ...partial,
        }

        const settingsChanged =
            prev.grid !== this._state.grid ||
            prev.opacity !== this._state.opacity ||
            prev.lineWidth !== this._state.lineWidth ||
            prev.color !== this._state.color ||
            prev.rotation !== this._state.rotation ||
            prev.measureUnit != this._state.measureUnit

        if (settingsChanged) {
            saveSettings({
                grid: this._state.grid,
                opacity: this._state.opacity,
                lineWidth: this._state.lineWidth,
                color: this._state.color,
                rotation: this._state.rotation,
                measureUnit: this._state.measureUnit,
                measureUnitSet: this._state.measureUnitSet,
            })
        }

        this.emit()
    }

    public setGrid(value: number): void {
        this.setState({ grid: value })
    }

    public setOpacity(value: number): void {
        this.setState({ opacity: value })
    }

    public setLineWidth(value: number): void {
        this.setState({ lineWidth: value })
    }

    public setColor(value: string): void {
        this.setState({ color: value })
    }

    public setRotation(value: number): void {
        this.setState({ rotation: value })
    }

    public setClickThrough(value: boolean): void {
        this.setState({ clickThrough: value })
    }

    public setAlwaysOnTop(value: boolean): void {
        this.setState({ alwaysOnTop: value })
    }
    public setTarget(value: Target): void {
        this.setState({ target: value })
    }

    public setTool(value: ToolMode): void {
        this.setState({ tool: value })
    }

    // こちらに移した方が良いのかも
    public setMeasureUnit(value: number): void {
        this.setState({ measureUnit: value })
    }

    public setCaptureImage(value?: {
        path?: string;
        buffer?: ArrayBuffer,
        sourceWidth: number;
        sourceHeight: number;
        cropX: number;
        cropY: number;
        cropWidth: number;
        cropHeight: number;
    }): void {
        this.setState({ captureImage: value })
    }

    public setCaptureMode(value: CaptureMode): void {
        this.setState({ captureMode: value })
    }

}

const appState = AppStateStore.Instance()

function useAppState() {
    return useSyncExternalStore(
        (listener) => appState.subscribe(listener),
        () => appState.getState(),
        () => appState.getState(),
    )
}


export type {
    Settings,
    AppState,
    CaptureMode
}

export {
    appState,
    loadSettings,
    saveSettings,
    useAppState
}
