import { invoke } from "@tauri-apps/api/core";

const hasPermission = async (): Promise<boolean> => {
  const hasPermission = await invoke<boolean>("check_screen_capture_permission");
  return hasPermission;
}

const requestScreenCapturePermission = async (): Promise<boolean> => {
  return await invoke<boolean>("request_screen_capture_permission");
};

const openPrivacySettings = async () => {
  // 画面収録の設定画面を直接開くURLスキーム
  await await invoke("open_privacy_settings");
};


const canCaptureForeignWindow = async (): Promise<boolean> => {
  return await invoke<boolean>("can_capture_foreign_window");
};


type ProbeResult = {
  status: "granted" | "denied" | "indeterminate";
  checkedWindows: number;
};

async function probePermission(): Promise<ProbeResult> {
  return await invoke("probe_screen_capture_permission");
}


//import { //canCaptureForeignWindow, hasPermission, 
//  openPrivacySettings, probePermission
//} from "./permissionCheck";
// アクセス権や 対象のWindowの状態から判断するためのコード
// ではあるが、MacOS の場合は、
// - アクセス権
// 更新後に再度権限を付与しないと動かないのに、付与済みと判定されるため、参考程度にしか使えない
// - キャプチャー対応のアプリ数
// キャプチャー対象がDesktopの場合は、これでもダメなので、参考程度にしか使えない
// "?"マークのヘルプボタンも用意して、そこからユーザーに設定を促すようにした
async function ensureScreenCapturePermission(props: { showToast: (msg: string) => void, showConfirmDialog: (options: { title: string, body: string }) => Promise<void> }): Promise<boolean> {
  const permissionResult = await probePermission();
  console.log("probePermission result", permissionResult);

  if (permissionResult.status === "granted") {
    return true;
  }

  if (permissionResult.status === "indeterminate") {
    //判定不能なので、ここでは止めない
    //実キャプチャで最終判断する
    if (permissionResult.status === "indeterminate") {
      props.showToast("Screen capture permission is indeterminate; proceeding to actual capture.");
      return true;
    }
    return true;
  }

  //denied
  props.showToast("Screen capture permission required.");

  await props.showConfirmDialog({
    title: "Screen Capture Reset Required",
    body:
      "Please go to Settings -> Privacy & Security -> Screen Recording & System Audio.\n\n" +
      "IMPORTANT: You must select 'tetorica-colors' and click the '-' (minus) button to remove it first, then click '+' to add it back.\n\n" +
      "Simply toggling it Off and On will NOT work.",
  });

  await openPrivacySettings();
  return false;
}
export {
  hasPermission,
  requestScreenCapturePermission,
  openPrivacySettings,
  canCaptureForeignWindow,
  probePermission,
  ensureScreenCapturePermission
}
