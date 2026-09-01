import { forwardRef, RefObject, useImperativeHandle } from "react"
import { isTauri } from "../../natives/native";
import { useDialog } from "../utils/useDialog";
import { AppBackgroundImageCanvasHandle, useBackgroundImageState } from "./AppBackgroundImageCanvas";
import { isPwaDistributionLocation } from "../../natives/pwa";
import { getVideo } from "../../natives/nativeWebScreenshot";
import { appState } from "../../state";

export type AppImportImageHandle = {
    handleImportImage: () => Promise<boolean>;
    handleImportScreen: () => Promise<void>;
};

type AppImportImageProps = {
    onChangeState?: () => void
    appBackgroundImageCanvasRef?: RefObject<AppBackgroundImageCanvasHandle | null>;
}

export const AppImportImage = forwardRef<AppImportImageHandle,  AppImportImageProps>(function (props, ref) {
    const _backgroundImageState = useBackgroundImageState();
    const dialog = useDialog();


    const syncBackgroundImageState = () => {
        props.onChangeState?.();
    };

    const handleImportImage = async (): Promise<boolean> => {
        const ret = await dialog.showFileDialog({});
        if (props.appBackgroundImageCanvasRef?.current) {
            if (ret?.files && ret.files.length > 0) {
                await props.appBackgroundImageCanvasRef.current.addImage(ret.files[0]);
                appState.setTarget("image");
                syncBackgroundImageState()
                return true;
            }
        }
        return false;
    };

    const handleImportScreen = async () => {
          if(!isTauri() && !isPwaDistributionLocation()) {
            // Capture は出来ない
            await dialog.showConfirmDialog({
              title: "",
              body: "Screen sharing is not supported on itch.io. Please use our PWA version instead."
            })
            return;
          }
          const data = await getVideo();
          await props.appBackgroundImageCanvasRef!.current!.addVideo(data!);
    };

    useImperativeHandle(
        ref,
        () => ({
            handleImportImage,
            handleImportScreen
        }),
        []
    );
    return (
        <>
            {!_backgroundImageState.hasImage && !isTauri() && (
                <div className="fixed inset-0 z-[99998] flex items-center justify-center pointer-events-none">
                    <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/85 px-6 py-5 text-white shadow-2xl backdrop-blur">
                        <div className="text-center">
                            <div className="text-base font-semibold">Import Image</div>
                            <div className="mt-1 text-sm text-slate-300">
                                Please import an image to start in browser mode
                            </div>
                        </div>

                        <button
                            onClick={handleImportImage}
                            className="rounded-xl border border-sky-400 bg-sky-700 px-5 py-2 text-sm font-medium text-white shadow transition hover:bg-sky-600"
                        >
                            Import Image
                        </button>
                        <button
                            onClick={handleImportScreen}
                            className="rounded-xl border border-sky-400 bg-sky-700 px-5 py-2 text-sm font-medium text-white shadow transition hover:bg-sky-600"
                        >
                            Import Screen
                        </button>
                    </div>
                </div>
            )}

        </>
    );
});
